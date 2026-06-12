from rest_framework import serializers
from MyApps.solicitudes.models import Solicitud
from MyApps.solicitudes.services import validar_y_clasificar_solicitud


class SolicitudSerializer(serializers.ModelSerializer):
    tipoEstadoCodigo = serializers.CharField(
        source="tipoEstado.codigoTipo",
        read_only=True
    )
    tipoMotivoRechazoCodigo = serializers.CharField(
        source="tipoMotivoRechazo.codigoTipo",
        read_only=True
    )

    class Meta:
        model = Solicitud
        fields = "__all__"
        extra_kwargs = {
            "tipoEstado": {
                "required": False,
                "allow_null": True
            },
            "tipoMotivoRechazo": {
                "required": False,
                "allow_null": True
            },
            "tipoModalidad": {
                "required": False,
                "allow_null": True
            },
            "tipoProioridad": {
                "required": False,
                "allow_null": True
            },
        }

    def validate_descripcionSolicitud(self, value):
        if len(value) < 10:
            raise serializers.ValidationError("La descripción debe tener mínimo 10 caracteres")
        return value

    def validate_direccionEntregaSolicitud(self, value):
        if len(value) < 5:
            raise serializers.ValidationError("La dirección de entrega es demasiado corta")
        return value

    def validate(self, data):
        recogida = data.get("direccionRecogidaSolicitud")
        entrega = data.get("direccionEntregaSolicitud")

        if recogida and recogida == entrega:
            raise serializers.ValidationError(
                "La dirección de recogida y entrega no pueden ser iguales"
            )

        return data

    def create(self, validated_data):
        solicitud = Solicitud(**validated_data)
        validar_y_clasificar_solicitud(solicitud)
        solicitud.save()
        return solicitud

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        validar_y_clasificar_solicitud(instance)
        instance.save()
        return instance
