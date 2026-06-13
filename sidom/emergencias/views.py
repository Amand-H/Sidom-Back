from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .models import Emergencia
from MyApps.asignaciones.models import Asignacion

@api_view(['POST'])
@permission_classes([AllowAny])
def registrar_emergencia(request):
    try:
        data = request.data
        asignacion_id = data.get('asignacion_id')
        domiciliario_id = data.get('domiciliario_id')
        tipo = data.get('tipo', 'EMERGENCIA')
        descripcion = data.get('descripcion', '')
        latitud = data.get('latitud')
        longitud = data.get('longitud')

        emergencia = Emergencia.objects.create(
            asignacion_id=asignacion_id,
            domiciliario_id=domiciliario_id,
            tipo=tipo,
            descripcion=descripcion,
            latitud=latitud,
            longitud=longitud,
        )

        try:
            asignacion = Asignacion.objects.get(id=asignacion_id)
            asignacion.estado = 'INCIDENCIA_SEGURIDAD'
            asignacion.save()
        except Asignacion.DoesNotExist:
            pass

        return Response({
            'mensaje': 'Emergencia registrada. Administrador notificado.',
            'emergencia_id': emergencia.id,
            'tipo': emergencia.tipo,
            'fecha_hora': emergencia.fecha_hora,
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def listar_emergencias(request):
    emergencias = Emergencia.objects.all()
    data = [{
        'id': e.id,
        'asignacion_id': e.asignacion_id,
        'domiciliario_id': e.domiciliario_id,
        'tipo': e.tipo,
        'descripcion': e.descripcion,
        'latitud': str(e.latitud),
        'longitud': str(e.longitud),
        'fecha_hora': e.fecha_hora,
        'atendida': e.atendida,
    } for e in emergencias]
    return Response(data)