from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from MyApps.usuarios.models import Cliente, Domiciliario, Usuario
from MyApps.core.models import TipoMaestra
from MyApps.usuarios.serializers import (
    ClienteSerializer,
    DomiciliarioSerializer,
    UsuarioSerializer
)


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all()
    serializer_class = ClienteSerializer


class DomiciliarioViewSet(viewsets.ModelViewSet):
    queryset = Domiciliario.objects.all()
    serializer_class = DomiciliarioSerializer


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.select_related("tipoRol", "cliente", "domiciliario")
    serializer_class = UsuarioSerializer


# Mapeo entre los códigos de TipoMaestra y los roles del frontend
ROL_MAP = {
    'ROL_CLIENTE': 'CLIENTE',
    'ROL_DOMI':    'DOMICILIARIO',
    'ROL_ADMIN':   'ADMIN',
}
ROL_CODIGO = {v: k for k, v in ROL_MAP.items()}  # inverso: CLIENTE → ROL_CLIENTE


class LoginView(APIView):
    """POST {username, password} → user info con rol."""

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if not username or not password:
            return Response(
                {'error': 'Usuario y contraseña son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            usuario = Usuario.objects.select_related(
                'tipoRol', 'cliente', 'domiciliario'
            ).get(usernameUsuario=username)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Credenciales incorrectas'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not usuario.activoUsuario:
            return Response(
                {'error': 'Usuario inactivo. Contacta al administrador.'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        if not check_password(password, usuario.passwordUsuario):
            return Response(
                {'error': 'Credenciales incorrectas'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        codigo_db = usuario.tipoRol.codigoTipo if usuario.tipoRol else ''
        rol_frontend = ROL_MAP.get(codigo_db, codigo_db)  # convierte ROL_CLIENTE → CLIENTE

        name = username
        entity_id = None
        if usuario.cliente:
            name = f"{usuario.cliente.nombresCliente} {usuario.cliente.apellidosCliente}"
            entity_id = usuario.cliente.id
        elif usuario.domiciliario:
            name = f"{usuario.domiciliario.nombresDomiciliario} {usuario.domiciliario.apellidosDomiciliario}"
            entity_id = usuario.domiciliario.id

        if rol_frontend == 'CLIENTE' and not entity_id:
            return Response(
                {'error': 'Este usuario CLIENTE no está vinculado a un cliente. Corrige el vínculo desde Usuarios.'},
                status=status.HTTP_409_CONFLICT
            )

        if rol_frontend == 'DOMICILIARIO' and not entity_id:
            return Response(
                {'error': 'Este usuario DOMICILIARIO no está vinculado a un domiciliario. Corrige el vínculo desde Usuarios.'},
                status=status.HTTP_409_CONFLICT
            )

        return Response({
            'id': usuario.id,
            'name': name,
            'username': username,
            'role': rol_frontend,
            'entityId': entity_id,
        })


class CambiarPasswordView(APIView):
    """POST {usuarioId, passwordActual, passwordNuevo} → cambia la contraseña verificando la actual."""

    def post(self, request):
        usuario_id    = request.data.get('usuarioId')
        pwd_actual    = request.data.get('passwordActual', '')
        pwd_nuevo     = request.data.get('passwordNuevo', '')

        if len(pwd_nuevo) < 8:
            return Response(
                {'error': 'La nueva contraseña debe tener mínimo 8 caracteres'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

        if not check_password(pwd_actual, usuario.passwordUsuario):
            return Response({'error': 'La contraseña actual es incorrecta'}, status=status.HTTP_400_BAD_REQUEST)

        usuario.passwordUsuario = make_password(pwd_nuevo)
        usuario.save()
        return Response({'message': 'Contraseña actualizada correctamente'})


class RegistroView(APIView):
    """POST para auto-registro de CLIENTE o DOMICILIARIO."""

    @transaction.atomic
    def post(self, request):
        rol = request.data.get('rol', '').upper()
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')

        if rol not in ('CLIENTE', 'DOMICILIARIO'):
            return Response(
                {'error': 'Rol inválido. Debe ser CLIENTE o DOMICILIARIO.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(username) < 4:
            return Response(
                {'error': 'El usuario debe tener mínimo 4 caracteres'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(password) < 8:
            return Response(
                {'error': 'La contraseña debe tener mínimo 8 caracteres'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Usuario.objects.filter(usernameUsuario=username).exists():
            return Response(
                {'error': 'El nombre de usuario ya está en uso'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Buscar el TipoMaestra usando el código real de la BD (ROL_CLIENTE / ROL_DOMI)
        codigo_db = ROL_CODIGO.get(rol)
        try:
            tipo_rol = TipoMaestra.objects.get(codigoTipo=codigo_db)
        except TipoMaestra.DoesNotExist:
            return Response(
                {'error': f'El tipo de rol "{codigo_db}" no está configurado en el sistema. Contacta al administrador.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cliente_obj = None
        domiciliario_obj = None

        if rol == 'CLIENTE':
            ser = ClienteSerializer(data={
                'identificacionCliente': request.data.get('identificacionCliente', ''),
                'nombresCliente':        request.data.get('nombresCliente', ''),
                'apellidosCliente':      request.data.get('apellidosCliente', ''),
                'telefonoCliente':       request.data.get('telefonoCliente', ''),
                'correoCliente':         request.data.get('correoCliente', ''),
                'direccionCliente':      request.data.get('direccionCliente', ''),
            })
            if not ser.is_valid():
                return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
            cliente_obj = ser.save()

        else:  # DOMICILIARIO
            ser = DomiciliarioSerializer(data={
                'identificacionDomiciliario': request.data.get('identificacionDomiciliario', ''),
                'nombresDomiciliario':        request.data.get('nombresDomiciliario', ''),
                'apellidosDomiciliario':      request.data.get('apellidosDomiciliario', ''),
                'telefonoDomiciliario':       request.data.get('telefonoDomiciliario', ''),
                'tipoVehiculoDomiciliario':   request.data.get('tipoVehiculoDomiciliario', ''),
                'placaDomiciliario':          request.data.get('placaDomiciliario', ''),
            })
            if not ser.is_valid():
                return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
            domiciliario_obj = ser.save()

        usuario = Usuario.objects.create(
            usernameUsuario=username,
            passwordUsuario=make_password(password),
            activoUsuario=True,
            tipoRol=tipo_rol,
            cliente=cliente_obj,
            domiciliario=domiciliario_obj,
        )

        name = (
            f"{cliente_obj.nombresCliente} {cliente_obj.apellidosCliente}"
            if cliente_obj
            else f"{domiciliario_obj.nombresDomiciliario} {domiciliario_obj.apellidosDomiciliario}"
        )

        return Response({
            'message': 'Registro exitoso',
            'id': usuario.id,
            'name': name,
            'username': username,
            'role': rol,           # ya viene como 'CLIENTE' o 'DOMICILIARIO' desde el frontend
            'entityId': cliente_obj.id if cliente_obj else domiciliario_obj.id,
        }, status=status.HTTP_201_CREATED)
