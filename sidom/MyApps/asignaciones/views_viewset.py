import json
from datetime import timedelta

from django.db import connection
from django.utils import timezone
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
    asignaciones_activas_domiciliario,
    aceptar_solicitud,
    publicar_solicitud,
)
from MyApps.usuarios.models import Domiciliario


def _call_sp(sp_call, params=None):
    """Execute a stored procedure with one OUT parameter and return parsed result."""
    with connection.cursor() as cursor:
        cursor.execute(sp_call, params or [])
        cursor.execute("SELECT @resultado")
        row = cursor.fetchone()
    resultado = row[0] if row else None
    try:
        return json.loads(resultado) if resultado else {}
    except (TypeError, ValueError):
        return {"resultado": resultado}


def _ensure_seguimiento(soli_disp_id):
    """
    After a SP accepts a pedido, ensure an Asignacion and SeguimientoEntrega exist.
    The SPs may accept the SolicitudDisponible but skip creating Asignacion/SeguimientoEntrega.
    """
    from MyApps.entregas.models import SeguimientoEntrega, HistorialEstadoEntrega
    from MyApps.core.models import TipoMaestra

    try:
        asig = Asignacion.objects.get(solicitudDisponible_id=soli_disp_id)
    except Asignacion.DoesNotExist:
        # SP updated SolicitudDisponible but didn't create the Asignacion record —
        # create it now if the disponible is properly accepted.
        try:
            disp = SolicitudDisponible.objects.select_related("tipoEstado").get(id=soli_disp_id)
        except SolicitudDisponible.DoesNotExist:
            return
        if disp.tipoEstado.codigoTipo != "ACEPTADA" or not disp.domiciliario_id:
            return
        asig, _ = Asignacion.objects.get_or_create(solicitudDisponible_id=soli_disp_id)

    if asig.seguimientos.exists():
        return  # Already has a SeguimientoEntrega

    # Find initial delivery state (try in priority order)
    estado = (
        TipoMaestra.objects.filter(codigoTipo="RECOGIDO").first()
        or TipoMaestra.objects.filter(codigoTipo="EN_PROCESO").first()
        or TipoMaestra.objects.filter(codigoTipo="PENDIENTE").first()
        or TipoMaestra.objects.filter(codigoTipo__icontains="RECOG").first()
    )
    if not estado:
        return  # No delivery state catalog — cannot create

    hies = HistorialEstadoEntrega.objects.create(tipoEstado=estado)
    SeguimientoEntrega.objects.create(
        asignacion=asig,
        historialEstadoEntrega=hies,
        fechaEstimadaSeguimiento=timezone.now() + timedelta(minutes=30),
    )


class SolicitudDisponibleViewSet(viewsets.ModelViewSet):
    queryset = SolicitudDisponible.objects.select_related(
        "solicitud",
        "domiciliario",
        "tipoEstado",
    )
    serializer_class = SolicitudDisponibleSerializer

    @action(detail=False, methods=["post"])
    def publicar(self, request):
        soli_id = request.data.get("solicitud")
        if not soli_id:
            return Response({"detail": "Parámetro solicitud requerido."}, status=400)
        result = _call_sp("CALL SP_P2_PUBLICAR_SOLICITUD(%s, @resultado)", [soli_id])
        return Response(result)

    @action(detail=True, methods=["post"])
    def aceptar(self, request, pk=None):
        from rest_framework.exceptions import ValidationError as DRFValidationError
        domi_id = request.data.get("domiciliario")
        if not domi_id:
            return Response({"detail": "Parámetro domiciliario requerido."}, status=400)
        try:
            disponible = SolicitudDisponible.objects.get(id=pk)
            domiciliario = Domiciliario.objects.get(id=domi_id)
            asignacion = aceptar_solicitud(disponible, domiciliario)
            return Response({"resultado": f"Pedido aceptado. Asignación #{asignacion.id} creada."})
        except SolicitudDisponible.DoesNotExist:
            return Response({"resultado": "Error: Solicitud no encontrada."}, status=404)
        except Domiciliario.DoesNotExist:
            return Response({"resultado": "Error: Domiciliario no encontrado."}, status=404)
        except (DRFValidationError, Exception) as e:
            detail = getattr(e, "detail", None)
            if detail:
                msg = detail[0] if isinstance(detail, list) else str(detail)
            else:
                msg = str(e)
            return Response({"resultado": f"Error: {msg}"}, status=400)

    @action(detail=True, methods=["post"], url_path="asignar-express")
    def asignar_express(self, request, pk=None):
        result = _call_sp("CALL SP_P2_ASIGNAR_EXPRESS_POR_RANKING(%s, @resultado)", [pk])
        try:
            _ensure_seguimiento(pk)
        except Exception:
            pass
        return Response(result)

    @action(detail=False, methods=["get"], url_path="panel-pool")
    def panel_pool(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM VW_P2_SOLICITUDES_DISPONIBLES_PANEL WHERE ESTADO = 'PUBLICADA'")
            cols = [d[0] for d in cursor.description]
            rows = [dict(zip(cols, row)) for row in cursor.fetchall()]

        # Exclude entries already assigned to a domiciliario (SP may not change ESTADO immediately)
        assigned_ids = set(
            SolicitudDisponible.objects
            .filter(tipoEstado__codigoTipo="PUBLICADA", domiciliario__isnull=False)
            .values_list("id", flat=True)
        )
        rows = [r for r in rows if r.get("SOLI_DISP_ID") not in assigned_ids]
        return Response(rows)

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

    @action(detail=False, methods=["get"], url_path="mis-activas")
    def mis_activas(self, request):
        """
        Returns active deliveries for a domiciliario, using the ORM to avoid
        dependency on view column names. Falls back gracefully when SPs haven't
        created SeguimientoEntrega records yet.
        """
        domiciliario_id = request.query_params.get("domiciliario_id")
        try:
            domiciliario_id = int(domiciliario_id) if domiciliario_id else None
        except (ValueError, TypeError):
            domiciliario_id = None

        # Auto-heal: SPs may leave ACEPTADA disponibles without Asignacion records.
        # Detect those orphans and create the missing Asignacion + SeguimientoEntrega.
        orphan_filter = {"tipoEstado__codigoTipo": "ACEPTADA", "domiciliario__isnull": False}
        if domiciliario_id:
            orphan_filter["domiciliario_id"] = domiciliario_id
        existing_ids = set(Asignacion.objects.values_list("solicitudDisponible_id", flat=True))
        orphans = SolicitudDisponible.objects.filter(**orphan_filter).exclude(id__in=existing_ids)
        for disp in orphans:
            try:
                _ensure_seguimiento(disp.id)
            except Exception:
                pass

        qs = Asignacion.objects.select_related(
            "solicitudDisponible__solicitud",
            "solicitudDisponible__domiciliario",
        )
        if domiciliario_id:
            qs = qs.filter(solicitudDisponible__domiciliario_id=domiciliario_id)

        ESTADOS_FINALES = {"ENTREGADO", "ENTREGADA"}
        data = []

        for asig in qs:
            disp = asig.solicitudDisponible
            sol = disp.solicitud

            # Get the most recent seguimiento (if any)
            segu = (
                asig.seguimientos
                .select_related("historialEstadoEntrega__tipoEstado")
                .order_by("-id")
                .first()
            )

            if segu:
                estado_cod = segu.historialEstadoEntrega.tipoEstado.codigoTipo
                estado_nombre = segu.historialEstadoEntrega.tipoEstado.nombreTipo
                cumplimiento = segu.cumplimientoSeguimiento
                segu_id = segu.id
            else:
                estado_cod = "PENDIENTE"
                estado_nombre = "Pendiente asignación"
                cumplimiento = "PENDIENTE"
                segu_id = None

            # Skip completed deliveries
            if estado_cod in ESTADOS_FINALES:
                continue

            ultima_ubic = asig.ubicaciones.first()

            data.append({
                "seguimientoId": segu_id,
                "asignacionId":  asig.id,
                "descripcion":   sol.descripcionSolicitud,
                "dirEntrega":    sol.direccionEntregaSolicitud,
                "estadoActual":  estado_cod,
                "estadoNombre":  estado_nombre,
                "cumplimiento":  cumplimiento,
                "lat":  float(ultima_ubic.latitudUbicacion)  if ultima_ubic else None,
                "lng":  float(ultima_ubic.longitudUbicacion) if ultima_ubic else None,
                "hora": str(ultima_ubic.fechaHoraUbicacion)  if ultima_ubic else None,
            })

        return Response(data)

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

    @action(detail=False, methods=["get"])
    def activas(self, request):
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM VW_P2_ASIGNACIONES_ACTIVAS")
            cols = [d[0] for d in cursor.description]
            rows = [dict(zip(cols, row)) for row in cursor.fetchall()]
        return Response(rows)

    @action(detail=False, methods=["get"], url_path="historial-domi")
    def historial_domi(self, request):
        """Completed deliveries (ENTREGADO) for a domiciliario — used by historial page."""
        domiciliario_id = request.query_params.get("domiciliario_id")
        try:
            domiciliario_id = int(domiciliario_id) if domiciliario_id else None
        except (ValueError, TypeError):
            domiciliario_id = None

        qs = Asignacion.objects.select_related(
            "solicitudDisponible__solicitud",
        )
        if domiciliario_id:
            qs = qs.filter(solicitudDisponible__domiciliario_id=domiciliario_id)

        ESTADOS_FINALES = {"ENTREGADO", "ENTREGADA"}
        data = []
        for asig in qs:
            segu = (
                asig.seguimientos
                .select_related("historialEstadoEntrega__tipoEstado")
                .order_by("-id")
                .first()
            )
            if not segu:
                continue
            estado_cod = segu.historialEstadoEntrega.tipoEstado.codigoTipo
            if estado_cod not in ESTADOS_FINALES:
                continue
            sol = asig.solicitudDisponible.solicitud
            data.append({
                "seguimientoId": segu.id,
                "asignacionId":  asig.id,
                "dirEntrega":    sol.direccionEntregaSolicitud,
                "estadoActual":  estado_cod,
                "estadoNombre":  segu.historialEstadoEntrega.tipoEstado.nombreTipo,
                "cumplimiento":  segu.cumplimientoSeguimiento,
                "fechaEstimada": str(segu.fechaEstimadaSeguimiento),
                "fechaReal":     str(segu.fechaRealSeguimiento) if segu.fechaRealSeguimiento else None,
            })
        return Response(data)

    @action(detail=False, methods=["get"], url_path="historial-cliente")
    def historial_cliente(self, request):
        """Completed/rejected solicitudes for a cliente — used by historial page."""
        from MyApps.solicitudes.models import Solicitud as SolicitudModel

        cliente_id = request.query_params.get("cliente_id")
        try:
            cliente_id = int(cliente_id) if cliente_id else None
        except (ValueError, TypeError):
            cliente_id = None

        # Solicitudes in final state (set by Python service)
        qs_final = SolicitudModel.objects.select_related(
            "tipoEstado", "tipoServicio"
        ).filter(tipoEstado__codigoTipo__in=["ENTREGADA", "RECHAZADA"])
        if cliente_id:
            qs_final = qs_final.filter(cliente_id=cliente_id)

        # Solicitudes with ENTREGADO seguimiento (SP may not update solicitud state)
        entregado_filter = {"seguimientos__historialEstadoEntrega__tipoEstado__codigoTipo": "ENTREGADO"}
        if cliente_id:
            entregado_filter["solicitudDisponible__solicitud__cliente_id"] = cliente_id
        sol_ids_entregado = set(
            Asignacion.objects.filter(**entregado_filter)
            .values_list("solicitudDisponible__solicitud_id", flat=True)
            .distinct()
        )

        all_sol_ids = set(qs_final.values_list("id", flat=True)) | sol_ids_entregado
        all_sols = SolicitudModel.objects.select_related("tipoEstado", "tipoServicio").filter(id__in=all_sol_ids)
        if cliente_id:
            all_sols = all_sols.filter(cliente_id=cliente_id)

        data = []
        for sol in all_sols:
            disp = sol.disponibles.select_related("domiciliario").filter(domiciliario__isnull=False).first()
            dom = disp.domiciliario if disp else None
            asig = None
            if disp:
                try:
                    asig = Asignacion.objects.get(solicitudDisponible=disp)
                except Asignacion.DoesNotExist:
                    pass
            data.append({
                "solicitudId":            sol.id,
                "descripcion":            sol.descripcionSolicitud,
                "dirEntrega":             sol.direccionEntregaSolicitud,
                "fechaSolicitud":         str(sol.fechaSolicitud),
                "estadoCodigo":           sol.tipoEstado.codigoTipo if sol.tipoEstado else "ENTREGADA",
                "estadoNombre":           sol.tipoEstado.nombreTipo if sol.tipoEstado else "Entregada",
                "tipoServicioNombre":     sol.tipoServicio.nombreTipo if sol.tipoServicio else "",
                "clienteId":              sol.cliente_id,
                "domiciliarioId":         dom.id if dom else None,
                "domiciliarioNombres":    dom.nombresDomiciliario if dom else None,
                "domiciliarioApellidos":  dom.apellidosDomiciliario if dom else None,
                "domiciliarioPlaca":      dom.placaDomiciliario if dom else None,
                "fechaAsignacion":        str(asig.fechaAsignacion) if asig else None,
            })
        return Response(data)

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
