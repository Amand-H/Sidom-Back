import json
from datetime import datetime, time

from django.db import connection
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response


def _call_sp(sp_call, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sp_call, params or [])
        cursor.execute("SELECT @resultado")
        row = cursor.fetchone()
    resultado = row[0] if row else None
    try:
        return json.loads(resultado) if resultado else {}
    except (TypeError, ValueError):
        return {"resultado": resultado}

from MyApps.entregas.models import (
    HistorialEstadoEntrega,
    SeguimientoEntrega,
    Novedad
)

from MyApps.entregas.serializers import (
    HistorialEstadoEntregaSerializer,
    SeguimientoEntregaSerializer,
    NovedadSerializer
)
from MyApps.core.models import TipoMaestra
from MyApps.entregas.services import (
    cambiar_estado_entrega,
    marcar_entrega_con_novedad,
    minutos_cumplimiento,
    resolver_novedad,
)


class HistorialEstadoEntregaViewSet(viewsets.ModelViewSet):
    queryset = HistorialEstadoEntrega.objects.select_related("tipoEstado")
    serializer_class = HistorialEstadoEntregaSerializer


class SeguimientoEntregaViewSet(viewsets.ModelViewSet):
    queryset = SeguimientoEntrega.objects.select_related(
        "asignacion",
        "asignacion__solicitudDisponible",
        "asignacion__solicitudDisponible__domiciliario",
        "historialEstadoEntrega",
        "historialEstadoEntrega__tipoEstado",
    )
    serializer_class = SeguimientoEntregaSerializer

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        tipo_estado_id = request.data.get("tipoEstado")
        tipo_estado = TipoMaestra.objects.filter(id=tipo_estado_id).first()
        if not tipo_estado:
            return Response({"detail": "Estado no encontrado."}, status=404)

        seguimiento = cambiar_estado_entrega(
            self.get_object(),
            tipo_estado,
            request.data.get("observacion"),
        )
        return Response(self.get_serializer(seguimiento).data)

    @action(detail=True, methods=["get"], url_path="minutos-cumplimiento")
    def minutos(self, request, pk=None):
        seguimiento = self.get_object()
        return Response({
            "seguimiento": seguimiento.id,
            "minutosCumplimiento": minutos_cumplimiento(seguimiento),
        })

    @action(detail=False, methods=["get"], url_path="tiempo-real")
    def tiempo_real(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM VW_P3_SEGUIMIENTO_TIEMPO_REAL")
            cols = [d[0] for d in cursor.description]
            data = [dict(zip(cols, row)) for row in cursor.fetchall()]

        segu_ids = [r["SEGU_ID"] for r in data if r.get("SEGU_ID")]
        comp_map = {
            s.id: float(s.compValor)
            for s in SeguimientoEntrega.objects.filter(id__in=segu_ids).only("id", "compValor")
            if s.compValor is not None
        }
        for row in data:
            row["compValor"] = comp_map.get(row.get("SEGU_ID"))

        return Response(data)

    @action(detail=False, methods=["post"], url_path="cambiar-estado-sp")
    def cambiar_estado_sp(self, request):
        segu_id    = request.data.get("segu_id")
        estado_cod = request.data.get("estado_cod")
        observacion = request.data.get("observacion", "")
        if not segu_id or not estado_cod:
            return Response({"detail": "segu_id y estado_cod son requeridos."}, status=400)
        result = _call_sp(
            "CALL SP_P3_CAMBIAR_ESTADO_ENTREGA(%s, %s, %s, @resultado)",
            [segu_id, estado_cod, observacion],
        )
        return Response(result)

    @action(detail=False, methods=["post"], url_path="actualizar-desempeno")
    def actualizar_desempeno(self, request):
        segu_id = request.data.get("segu_id")
        if not segu_id:
            return Response({"detail": "segu_id es requerido."}, status=400)
        result = _call_sp(
            "CALL SP_P3_ACTUALIZAR_HISTORIAL_DESEMPENO(%s, @resultado)",
            [segu_id],
        )
        return Response(result)

    @action(detail=False, methods=["get"], url_path="historial-desempeno")
    def historial_desempeno(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM VW_P3_HISTORIAL_DESEMPENO_ZONA")
            cols = [d[0] for d in cursor.description]
            data = [dict(zip(cols, row)) for row in cursor.fetchall()]
        return Response(data)

    @action(detail=False, methods=["get"], url_path="tiempo-real-legacy")
    def tiempo_real_legacy(self, request):
        data = []
        for seguimiento in self.get_queryset():
            asignacion = seguimiento.asignacion
            disponible = asignacion.solicitudDisponible
            ultima = asignacion.ubicaciones.order_by("-fechaHoraUbicacion").first()
            data.append({
                "seguimiento": seguimiento.id,
                "asignacion": asignacion.id,
                "domiciliario": disponible.domiciliario_id,
                "cliente": disponible.solicitud.cliente_id,
                "direccionEntrega": disponible.solicitud.direccionEntregaSolicitud,
                "estadoActual": seguimiento.historialEstadoEntrega.tipoEstado.codigoTipo,
                "cumplimiento": seguimiento.cumplimientoSeguimiento,
                "minutosCumplimiento": minutos_cumplimiento(seguimiento),
                "ultimaLatitud": ultima.latitudUbicacion if ultima else None,
                "ultimaLongitud": ultima.longitudUbicacion if ultima else None,
                "ultimaFechaHora": ultima.fechaHoraUbicacion if ultima else None,
            })
        return Response(data)


class NovedadViewSet(viewsets.ModelViewSet):
    queryset = Novedad.objects.select_related(
        "seguimientoEntrega",
        "tipoNovedad",
        "tipoEstado",
    )
    serializer_class = NovedadSerializer

    def perform_create(self, serializer):
        novedad = serializer.save()
        marcar_entrega_con_novedad(novedad)

    @action(detail=True, methods=["post"])
    def resolver(self, request, pk=None):
        novedad = resolver_novedad(self.get_object(), request.data.get("solucion"))
        return Response(self.get_serializer(novedad).data)

    @action(detail=False, methods=["get"], url_path="sin-resolver")
    def sin_resolver(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM VW_P3_NOVEDADES_SIN_RESOLVER")
            cols = [d[0] for d in cursor.description]
            data = [dict(zip(cols, row)) for row in cursor.fetchall()]
        return Response(data)

    @action(detail=False, methods=["post"], url_path="resolver-novedad")
    def resolver_novedad_sp(self, request):
        nove_id  = request.data.get("nove_id")
        solucion = request.data.get("solucion", "")
        if not nove_id:
            return Response({"detail": "nove_id es requerido."}, status=400)
        result = _call_sp(
            "CALL SP_P3_RESOLVER_NOVEDAD(%s, %s, @resultado)",
            [nove_id, solucion],
        )
        return Response(result)
