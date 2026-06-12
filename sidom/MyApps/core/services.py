from django.core.exceptions import ValidationError

from MyApps.core.models import TipoMaestra


CATALOGOS_INICIALES = {
    "CAT_ROL": ("Roles de usuario", ["ROL_ADMIN", "ROL_CLIENTE", "ROL_DOMI"]),
    "CAT_ESTADO_SOL": (
        "Estados de solicitud",
        ["PENDIENTE", "VALIDADA", "RECHAZADA", "EN_PROCESO", "ENTREGADA"],
    ),
    "CAT_SERVICIO": (
        "Tipos de servicio",
        ["COMIDA", "FARMACIA", "MENSAJERIA", "SUPERMERCADO"],
    ),
    "CAT_ZONA": (
        "Zonas de cobertura",
        ["ZONA_CENTRO", "ZONA_NORTE", "ZONA_SUR", "ZONA_RURAL"],
    ),
    "CAT_MOTIVO": (
        "Motivos de rechazo",
        ["CLIENTE_NO_REG", "SERV_NO_DISP", "ZONA_SIN_COB", "DATOS_INCOMP"],
    ),
    "CAT_ESTADO_DISP": (
        "Estados de disponible",
        ["PUBLICADA", "ACEPTADA", "EXPIRADA"],
    ),
    "CAT_ESTADO_ENT": (
        "Estados de entrega",
        ["RECOGIDO", "EN_CAMINO", "ENTREGADO", "CON_NOVEDAD"],
    ),
    "CAT_NOVEDAD": (
        "Tipos de novedad / cierre",
        ["CLI_AUSENTE", "DIR_INCORRECTA", "PED_DANADO", "ACCIDENTE", "ROBO", "RESUELTA"],
    ),
    "CAT_MODALIDAD": (
        "Modalidades de entrega",
        ["MOD_ESTANDAR", "MOD_EXPRESS"],
    ),
}


def obtener_tipo(codigo, obligatorio=True):
    tipo = TipoMaestra.objects.filter(codigoTipo=codigo).first()
    if obligatorio and not tipo:
        raise ValidationError(f"No existe el tipo maestro requerido: {codigo}")
    return tipo


def tipo_pertenece_a(tipo, codigo_categoria):
    if not tipo:
        return False

    categoria = obtener_tipo(codigo_categoria, obligatorio=False)
    if not categoria:
        return True

    return tipo.padreTipo_id == categoria.id


def crear_catalogos_iniciales():
    creados = 0

    for codigo_categoria, (nombre_categoria, codigos_hijos) in CATALOGOS_INICIALES.items():
        categoria, creado = TipoMaestra.objects.get_or_create(
            codigoTipo=codigo_categoria,
            defaults={
                "nombreTipo": nombre_categoria,
                "esTabla": True,
            },
        )
        creados += int(creado)

        for codigo_hijo in codigos_hijos:
            nombre = codigo_hijo.replace("_", " ").title()
            _, creado = TipoMaestra.objects.get_or_create(
                codigoTipo=codigo_hijo,
                defaults={
                    "nombreTipo": nombre,
                    "padreTipo": categoria,
                    "esTabla": False,
                },
            )
            creados += int(creado)

    return creados
