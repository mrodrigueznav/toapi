#!/usr/bin/env bash
# Registra las variables del .env en Azure App Service (resource group: gsya).
# Uso: ./scripts/azure-env-set.sh <nombre-de-tu-webapp>
# Requiere: az login y .env en la raíz del proyecto.

set -e
RESOURCE_GROUP="${RESOURCE_GROUP:-gsya}"
APP_NAME="$1"
ENV_FILE="${ENV_FILE:-.env}"

if [[ -z "$APP_NAME" ]]; then
  echo "Uso: $0 <nombre-de-tu-webapp>"
  echo "Ejemplo: $0 tohuanti-api"
  echo "Opcional: RESOURCE_GROUP=gsya ENV_FILE=.env $0 <nombre-webapp>"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "No se encontró $ENV_FILE"
  exit 1
fi

# Construir lista KEY=valor (solo primera = es el separador; valor puede contener = o #)
SETTINGS=()
while IFS= read -r line || [[ -n "$line" ]]; do
  # Ignorar líneas vacías o comentarios (solo # al inicio, con espacios opcionales)
  line_trimmed="${line#"${line%%[![:space:]]*}"}"
  [[ -z "$line_trimmed" || "$line_trimmed" == \#* ]] && continue
  # Ignorar export KEY=... (quitar prefijo export)
  line_trimmed="${line_trimmed#export }"
  [[ "$line_trimmed" != *=* ]] && continue

  key="${line_trimmed%%=*}"
  key="${key%"${key##*[![:space:]]}"}"
  key="${key#"${key%%[![:space:]]*}"}"
  value="${line_trimmed#*=}"
  # Quitar comillas dobles al inicio/final del valor
  if [[ "$value" == \"*\" ]]; then
    value="${value:1:-1}"
  fi
  [[ -z "$key" ]] && continue

  # Si el valor tiene espacios o =, pasarlo entre comillas para Azure CLI
  if [[ "$value" == *[=\ ]* ]]; then
    SETTINGS+=( "${key}=\"${value}\"" )
  else
    SETTINGS+=( "${key}=${value}" )
  fi
done < "$ENV_FILE"

if [[ ${#SETTINGS[@]} -eq 0 ]]; then
  echo "No hay variables en $ENV_FILE"
  exit 1
fi

echo "Registrando ${#SETTINGS[@]} variables en $APP_NAME (resource group: $RESOURCE_GROUP) ..."
# az webapp config appsettings set \
#   --resource-group "$RESOURCE_GROUP" \
#   --name "$APP_NAME" \
#   --settings "${SETTINGS[@]}" \
#   --output table
az webapp config appsettings list \
  --resource-group gsya \
  --name $APP_NAME --query "[].{name:name, value:value}" --output table
echo "Listo."
