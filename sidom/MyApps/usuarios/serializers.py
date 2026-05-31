from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from MyApps.usuarios.models import Cliente, Domiciliario, Usuario


class ClienteSerializer(serializers.ModelSerializer):

    class Meta:
        model = Cliente
        fields = "__all__"

    def validate_nombresCliente(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("El nombre no puede ser tan corto")
        return value

    def validate_apellidosCliente(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("El apellido no puede ser tan corto")
        return value

    def validate_telefonoCliente(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("El teléfono solo debe contener números")
        return value

    def validate_identificacionCliente(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("La identificación solo debe contener números")
        return value
    
    def validate_correoCliente(self, value):
        if "@" not in value:
            raise serializers.ValidationError("Ingrese un correo válido")
        return value
    

class DomiciliarioSerializer(serializers.ModelSerializer):

    class Meta:
        model = Domiciliario
        fields = "__all__"

    def validate_nombresDomiciliario(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("El nombre no puede ser tan corto")
        return value

    def validate_apellidosDomiciliario(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("El apellido no puede ser tan corto")
        return value

    def validate_telefonoDomiciliario(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("El teléfono solo debe contener números")
        return value

    def validate_identificacionDomiciliario(self, value):
        if not value.isdigit():
            raise serializers.ValidationError("La identificación solo debe contener números")
        return value

    def validate_placaDomiciliario(self, value):
        value = value.upper()

        if len(value) < 5:
            raise serializers.ValidationError("La placa debe tener mínimo 5 caracteres")

        if not all(c.isalnum() or c == "-" for c in value):
            raise serializers.ValidationError("La placa solo debe contener letras, números o guiones")

        return value


class UsuarioSerializer(serializers.ModelSerializer):

    class Meta:
        model = Usuario
        fields = "__all__"
        extra_kwargs = {
            "passwordUsuario": {
                "write_only": True
            }
        }

    def validate_usernameUsuario(self, value):
        if len(value) < 4:
            raise serializers.ValidationError("El usuario debe tener mínimo 4 caracteres")
        return value

    def validate_passwordUsuario(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("El password debe tener mínimo 8 caracteres")
        return value

    def validate(self, data):
        cliente = data.get("cliente", getattr(self.instance, "cliente", None))
        domiciliario = data.get("domiciliario", getattr(self.instance, "domiciliario", None))
        tipo_rol = data.get("tipoRol", getattr(self.instance, "tipoRol", None))

        if cliente and domiciliario:
            raise serializers.ValidationError(
                "Un usuario solo puede estar vinculado a cliente o a domiciliario"
            )

        codigo_rol = tipo_rol.codigoTipo if tipo_rol else ""
        if codigo_rol == "ROL_CLIENTE" and not cliente:
            raise serializers.ValidationError(
                "Un usuario con rol CLIENTE debe estar vinculado a un cliente."
            )

        if codigo_rol == "ROL_DOMI" and not domiciliario:
            raise serializers.ValidationError(
                "Un usuario con rol DOMICILIARIO debe estar vinculado a un domiciliario."
            )

        if codigo_rol == "ROL_ADMIN" and (cliente or domiciliario):
            raise serializers.ValidationError(
                "Un usuario ADMIN no debe estar vinculado a cliente ni domiciliario."
            )

        return data

    def create(self, validated_data):
        validated_data["passwordUsuario"] = make_password(validated_data["passwordUsuario"])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        password = validated_data.get("passwordUsuario")
        if password:
            validated_data["passwordUsuario"] = make_password(password)
        else:
            validated_data.pop("passwordUsuario", None)
        return super().update(instance, validated_data)
