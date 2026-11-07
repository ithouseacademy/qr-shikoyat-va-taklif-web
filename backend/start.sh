#!/usr/bin/env sh
set -e

python manage.py migrate --noinput

if [ -n "$SUPERADMIN_EMAIL" ] && [ -n "$SUPERADMIN_PASSWORD" ]; then
  python manage.py create_superadmin --quiet
fi

case "$1" in
  worker) exec celery -A config worker -l info ;;
  beat) exec celery -A config beat -l info ;;
esac

exec daphne -b 0.0.0.0 -p "${PORT:-8000}" config.asgi:application
