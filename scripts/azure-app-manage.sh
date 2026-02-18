#!/usr/bin/env bash
# Utilidades rápidas para Azure App Service.
# Uso:
#   ./scripts/azure-app-manage.sh <webapp-name> list     # listar app settings
#   ./scripts/azure-app-manage.sh <webapp-name> restart  # reiniciar la app
#
# Variables opcionales:
#   RESOURCE_GROUP  (por defecto: gsya)

set -e

RESOURCE_GROUP="${RESOURCE_GROUP:-gsya}"
APP_NAME="${APP_NAME:-toapi}"
ACTION="$2"

if [[ -z "$APP_NAME" || -z "$ACTION" ]]; then
  echo "Uso:"
  echo "  $0 <webapp-name> list"
  echo "  $0 <webapp-name> restart"
  echo
  echo "Ejemplos:"
  echo "  $0 tohuanti-api list"
  echo "  $0 tohuanti-api restart"
  echo
  echo "Puedes sobreescribir el resource group:"
  echo "  RESOURCE_GROUP=otro-rg $0 tohuanti-api list"
  exit 1
fi

case "$ACTION" in
  list)
    echo "Listando app settings de '$APP_NAME' en resource group '$RESOURCE_GROUP'..."
    az webapp config appsettings list \
      --resource-group "$RESOURCE_GROUP" \
      --name "$APP_NAME" \
      --output table
    ;;
  restart)
    echo "Reiniciando Web App '$APP_NAME' en resource group '$RESOURCE_GROUP'..."
    az webapp restart \
      --resource-group "$RESOURCE_GROUP" \
      --name "$APP_NAME"
    echo "Reinicio solicitado."
    ;;
  *)
    echo "Acción desconocida: $ACTION"
    echo "Acciones soportadas: list, restart"
    exit 1
    ;;
esac

