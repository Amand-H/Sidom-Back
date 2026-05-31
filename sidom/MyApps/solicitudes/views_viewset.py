from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from MyApps.solicitudes.models import Solicitud
from MyApps.solicitudes.serializers import SolicitudSerializer
from MyApps.solicitudes.services import (
    alerta_solicitud,
    cliente_tiene_solicitud_activa,
    estadisticas_solicitudes,
    reintentar_solicitud_rechazada,
    validar_y_clasificar_solicitud,
)
from MyApps.asignaciones.services import publicar_solicitud
from MyApps.usuarios.models import Cliente


class SolicitudViewSet(viewsets.ModelViewSet):
    queryset = Solicitud.objects.select_related(
        "cliente",
        "tipoZona",
        "tipoServicio",
        "tipoEstado",
        "tipoMotivoRechazo",
    )
    serializer_class = SolicitudSerializer

    def perform_create(self, serializer):
        """Al crear una solicitud: validar automáticamente y publicarla al pool si es válida."""
        solicitud = serializer.save()
        validar_y_clasificar_solicitud(solicitud)
        solicitud.save(update_fields=["tipoEstado", "tipoMotivoRechazo"])
        if solicitud.tipoEstado.codigoTipo == "VALIDADA":
            publicar_solicitud(solicitud)

    @action(detail=True, methods=["post"])
    def reintentar(self, request, pk=None):
        solicitud = reintentar_solicitud_rechazada(self.get_object())
        return Response(self.get_serializer(solicitud).data)

    @action(detail=False, methods=["get"], url_path="cliente-activa")
    def cliente_activa(self, request):
        cliente_id = request.query_params.get("cliente")
        if not cliente_id:
            return Response({"detail": "Debe enviar el parámetro cliente."}, status=400)

        cliente = Cliente.objects.filter(id=cliente_id).first()
        if not cliente:
            return Response({"detail": "Cliente no encontrado."}, status=404)

        return Response({
            "cliente": cliente.id,
            "tieneSolicitudActiva": cliente_tiene_solicitud_activa(cliente),
        })

    @action(detail=False, methods=["get"])
    def estadisticas(self, request):
        return Response(estadisticas_solicitudes())

    @action(detail=False, methods=["get"])
    def panel(self, request):
        data = []
        for solicitud in self.get_queryset():
            item = self.get_serializer(solicitud).data
            item["alerta"] = alerta_solicitud(solicitud)
            data.append(item)
        return Response(data)
