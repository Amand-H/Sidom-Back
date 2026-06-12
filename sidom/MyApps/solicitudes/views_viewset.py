import json

from django.db import connection
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
    def cotizacion(self, request):
        tipo_zona_id = request.query_params.get("tipo_zona")
        if not tipo_zona_id:
            return Response({"detail": "Parámetro tipo_zona requerido."}, status=400)
        with connection.cursor() as cursor:
            cursor.execute("SELECT FN_P1_COTIZACION_CAPACIDAD_ZONA(%s)", [tipo_zona_id])
            row = cursor.fetchone()
        return Response(json.loads(row[0]) if row and row[0] else {})

    @action(detail=False, methods=["get"])
    def panel_vistas(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM VW_P1_PANEL_SOLICITUDES")
            cols = [d[0] for d in cursor.description]
            rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
        return Response(rows)

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

    @action(detail=False, methods=["post"], url_path="procesar-recurrentes")
    def procesar_recurrentes(self, request):
        with connection.cursor() as cursor:
            cursor.execute("CALL SP_P1_PROCESAR_SOLICITUDES_RECURRENTES(@resultado)")
            cursor.execute("SELECT @resultado")
            row = cursor.fetchone()
        resultado = row[0] if row else None
        try:
            resultado = json.loads(resultado) if resultado else {}
        except (TypeError, ValueError):
            resultado = {"resultado": resultado}
        return Response(resultado)

    @action(detail=False, methods=["get"], url_path="recurrentes")
    def recurrentes(self, request):
        with connection.cursor() as cursor:
            try:
                cursor.execute("SELECT * FROM VW_P1_SOLICITUDES_RECURRENTES_ACTIVAS")
            except Exception:
                cursor.execute("SELECT * FROM TBL_SOLICITUDES_RECURRENTES")
            cols = [d[0] for d in cursor.description]
            rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
        return Response(rows)
