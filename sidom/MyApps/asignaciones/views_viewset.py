from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from MyApps.asignaciones.models import (
    SolicitudDisponible,
    Asignacion
)

from MyApps.asignaciones.serializers import (
    SolicitudDisponibleSerializer,
    AsignacionSerializer
)
from MyApps.asignaciones.services import (
    aceptar_solicitud,
    asignaciones_activas_domiciliario,
    publicar_solicitud,
)
from MyApps.solicitudes.models import Solicitud
from MyApps.usuarios.models import Domiciliario


class SolicitudDisponibleViewSet(viewsets.ModelViewSet):
    queryset = SolicitudDisponible.objects.select_related(
        "solicitud",
        "domiciliario",
        "tipoEstado",
    )
    serializer_class = SolicitudDisponibleSerializer

    @action(detail=False, methods=["post"])
    def publicar(self, request):
        solicitud_id = request.data.get("solicitud")
        solicitud = Solicitud.objects.filter(id=solicitud_id).first()
        if not solicitud:
            return Response({"detail": "Solicitud no encontrada."}, status=404)

        disponible = publicar_solicitud(solicitud)
        return Response(self.get_serializer(disponible).data)

    @action(detail=True, methods=["post"])
    def aceptar(self, request, pk=None):
        domiciliario_id = request.data.get("domiciliario")
        domiciliario = Domiciliario.objects.filter(id=domiciliario_id).first()
        if not domiciliario:
            return Response({"detail": "Domiciliario no encontrado."}, status=404)

        asignacion = aceptar_solicitud(self.get_object(), domiciliario)
        return Response(AsignacionSerializer(asignacion).data)

    @action(detail=False, methods=["get"])
    def panel(self, request):
        # Auto-publicar cualquier solicitud VALIDADA que aún no tenga SolicitudDisponible
        from MyApps.solicitudes.models import Solicitud as SolicitudModel
        pendientes = SolicitudModel.objects.filter(
            tipoEstado__codigoTipo="VALIDADA"
        ).exclude(
            disponibles__tipoEstado__codigoTipo__in=["PUBLICADA", "ACEPTADA"]
        )
        for sol in pendientes:
            try:
                publicar_solicitud(sol)
            except Exception:
                pass

        qs = self.get_queryset().filter(tipoEstado__codigoTipo="PUBLICADA", domiciliario__isnull=True)
        return Response(self.get_serializer(qs, many=True).data)


class AsignacionViewSet(viewsets.ModelViewSet):
    queryset = Asignacion.objects.select_related(
        "solicitudDisponible",
        "solicitudDisponible__solicitud",
        "solicitudDisponible__domiciliario",
    )
    serializer_class = AsignacionSerializer

    @action(detail=False, methods=["get"], url_path="carga-domiciliario")
    def carga_domiciliario(self, request):
        domiciliario_id = request.query_params.get("domiciliario")
        domiciliario = Domiciliario.objects.filter(id=domiciliario_id).first()
        if not domiciliario:
            return Response({"detail": "Domiciliario no encontrado."}, status=404)

        return Response({
            "domiciliario": domiciliario.id,
            "asignacionesActivas": asignaciones_activas_domiciliario(domiciliario),
        })

    @action(detail=False, methods=["get"], url_path="gps-activo")
    def gps_activo(self, request):
        data = []
        for asignacion in self.get_queryset():
            ultima = asignacion.ubicaciones.order_by("-fechaHoraUbicacion").first()
            data.append({
                "asignacion": asignacion.id,
                "solicitudDisponible": asignacion.solicitudDisponible_id,
                "domiciliario": asignacion.solicitudDisponible.domiciliario_id,
                "ultimaLatitud": ultima.latitudUbicacion if ultima else None,
                "ultimaLongitud": ultima.longitudUbicacion if ultima else None,
                "ultimaFechaHora": ultima.fechaHoraUbicacion if ultima else None,
            })
        return Response(data)
