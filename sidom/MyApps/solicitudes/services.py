from django.db.models import Count
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from MyApps.core.services import obtener_tipo, tipo_pertenece_a
from MyApps.solicitudes.models import Solicitud
from MyApps.usuarios.models import Usuario


ESTADOS_SOLICITUD_ACTIVA = ["PENDIENTE", "VALIDADA", "EN_PROCESO"]


def cliente_activo(cliente):
    usuarios = Usuario.objects.filter(cliente=cliente)
    if not usuarios.exists():
        return True
    return usuarios.filter(activoUsuario=True).exists()


def cliente_tiene_solicitud_activa(cliente, excluir_solicitud_id=None):
    qs = Solicitud.objects.filter(
        cliente=cliente,
        tipoEstado__codigoTipo__in=ESTADOS_SOLICITUD_ACTIVA,
    )

    if excluir_solicitud_id:
        qs = qs.exclude(id=excluir_solicitud_id)

    return qs.exists()


def existe_solicitud_duplicada(cliente, direccion_entrega, excluir_solicitud_id=None):
    qs = Solicitud.objects.filter(
        cliente=cliente,
        direccionEntregaSolicitud__iexact=direccion_entrega.strip(),
        fechaSolicitud=timezone.localdate(),
        tipoEstado__codigoTipo__in=ESTADOS_SOLICITUD_ACTIVA,
    )

    if excluir_solicitud_id:
        qs = qs.exclude(id=excluir_solicitud_id)

    return qs.exists()


def validar_y_clasificar_solicitud(solicitud):
    if existe_solicitud_duplicada(
        solicitud.cliente,
        solicitud.direccionEntregaSolicitud,
        excluir_solicitud_id=solicitud.id,
    ):
        raise ValidationError(
            "El cliente ya tiene una solicitud activa para esa dirección de entrega hoy."
        )

    motivo_rechazo = None

    if not cliente_activo(solicitud.cliente):
        motivo_rechazo = obtener_tipo("CLIENTE_NO_REG")
    elif not tipo_pertenece_a(solicitud.tipoServicio, "CAT_SERVICIO"):
        motivo_rechazo = obtener_tipo("SERV_NO_DISP")
    elif not tipo_pertenece_a(solicitud.tipoZona, "CAT_ZONA"):
        motivo_rechazo = obtener_tipo("ZONA_SIN_COB")
    elif not solicitud.descripcionSolicitud or not solicitud.direccionEntregaSolicitud:
        motivo_rechazo = obtener_tipo("DATOS_INCOMP")

    if motivo_rechazo:
        solicitud.tipoEstado = obtener_tipo("RECHAZADA")
        solicitud.tipoMotivoRechazo = motivo_rechazo
    else:
        solicitud.tipoEstado = obtener_tipo("VALIDADA")
        solicitud.tipoMotivoRechazo = None

    if not solicitud.tipoModalidad_id:
        solicitud.tipoModalidad = obtener_tipo("MOD_ESTANDAR")

    return solicitud


def reintentar_solicitud_rechazada(solicitud):
    if solicitud.tipoEstado.codigoTipo != "RECHAZADA":
        raise ValidationError("Solo se pueden reintentar solicitudes rechazadas.")

    validar_y_clasificar_solicitud(solicitud)
    solicitud.save()
    return solicitud


def tasa_rechazo_servicio(tipo_servicio):
    total = Solicitud.objects.filter(tipoServicio=tipo_servicio).count()
    if total == 0:
        return 0

    rechazadas = Solicitud.objects.filter(
        tipoServicio=tipo_servicio,
        tipoEstado__codigoTipo="RECHAZADA",
    ).count()

    return round((rechazadas / total) * 100, 2)


def estadisticas_solicitudes():
    servicios = Solicitud.objects.values(
        "tipoServicio",
        "tipoServicio__nombreTipo",
        "tipoServicio__codigoTipo",
    ).annotate(total=Count("id"))

    resultado = []
    for servicio in servicios:
        tipo_id = servicio["tipoServicio"]
        total = servicio["total"]
        validadas = Solicitud.objects.filter(
            tipoServicio_id=tipo_id,
            tipoEstado__codigoTipo="VALIDADA",
        ).count()
        rechazadas = Solicitud.objects.filter(
            tipoServicio_id=tipo_id,
            tipoEstado__codigoTipo="RECHAZADA",
        ).count()
        motivo = (
            Solicitud.objects.filter(
                tipoServicio_id=tipo_id,
                tipoEstado__codigoTipo="RECHAZADA",
                tipoMotivoRechazo__isnull=False,
            )
            .values("tipoMotivoRechazo__nombreTipo")
            .annotate(total=Count("id"))
            .order_by("-total")
            .first()
        )

        resultado.append(
            {
                "tipoServicio": tipo_id,
                "servicio": servicio["tipoServicio__nombreTipo"],
                "codigo": servicio["tipoServicio__codigoTipo"],
                "total": total,
                "validadas": validadas,
                "rechazadas": rechazadas,
                "tasaRechazo": round((rechazadas / total) * 100, 2) if total else 0,
                "motivoMasFrecuente": motivo["tipoMotivoRechazo__nombreTipo"] if motivo else None,
            }
        )

    return resultado


def alerta_solicitud(solicitud):
    if solicitud.tipoEstado.codigoTipo == "RECHAZADA":
        return "REQUIERE_ATENCION"
    if solicitud.tipoEstado.codigoTipo == "VALIDADA" and not solicitud.disponibles.exists():
        return "SIN_ASIGNAR"
    if solicitud.fechaSolicitud and (timezone.localdate() - solicitud.fechaSolicitud).days >= 1:
        return "URGENTE"
    return "NORMAL"
