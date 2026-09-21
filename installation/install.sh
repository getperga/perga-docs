#!/bin/sh
set -e

# Detect if the terminal supports OSC 8 clickable hyperlinks
supports_hyperlinks() {
  # Allow manual override
  if [ -n "$FORCE_HYPERLINK" ]; then
    return 0
  fi
  if [ -n "$NO_HYPERLINK" ]; then
    return 1
  fi

  # Must be a TTY
  if [ ! -t 1 ]; then
    return 1
  fi

  # Known terminal emulators with OSC 8 support
  case "$TERM_PROGRAM" in
    iTerm.app|WezTerm|Hyper|vscode)
      return 0 ;;
  esac

  # VTE (GNOME Terminal, etc.) supports OSC 8 since 0.50 (5000)
  if [ -n "$VTE_VERSION" ] && [ "$VTE_VERSION" -ge 5000 ] 2>/dev/null; then
    return 0
  fi

  # domterm reports support
  if [ -n "$DOMTERM" ]; then
    return 0
  fi

  # Fallback: assume no support
  return 1
}

# Print a label that is clickable when supported, with a plain URL fallback
print_link() {
  label="$1"
  url="$2"
  if supports_hyperlinks; then
    # OSC 8: ESC ] 8 ; params ; URI ST  visible-text  ESC ] 8 ; ; ST
    printf "\033]8;;%s\007%s\033]8;;\007\n" "$url" "$label"
  else
    printf "%s: %s\n" "$label" "$url"
  fi
}

echo "Installing Perga..."

download_file() {
  url="$1"
  destination="$2"
  temporary_file="${destination}.tmp"

  curl -fsSL -o "$temporary_file" "$url"
  mv "$temporary_file" "$destination"
}

is_new_install=false

# Ensure docker-compose.yml exists; fetch if missing
if [ ! -f docker-compose.yml ]; then
  is_new_install=true
  echo "Fetching docker-compose.yml..."
  download_file \
    https://docs.getperga.me/installation/docker-compose.yml \
    docker-compose.yml
  echo "docker-compose.yml downloaded."
fi

# Ensure nginx config exists (required by docker-compose volume mount)
mkdir -p nginx
if [ ! -f nginx/nginx.conf ]; then
  echo "Fetching default nginx.conf..."
  download_file \
    https://docs.getperga.me/installation/nginx/nginx.conf \
    nginx/nginx.conf
  echo "nginx/nginx.conf downloaded. You can customize it if needed."
fi

# Ensure .env.example exists; fetch if missing
if [ ! -f .env.example ]; then
  echo "Fetching .env.example..."
  download_file \
    https://docs.getperga.me/installation/.env.example \
    .env.example
  echo ".env.example downloaded."
fi

# Ensure .env exists
if [ ! -f .env ]; then
  cp .env.example .env
  echo ".env created from .env.example. You can customize it if needed."
fi

if [ "$is_new_install" = true ]; then
  docker compose pull
else
  echo "Existing installation detected."
  echo "Configuration and images will not be updated."
  print_link \
    "Update instructions" \
    "https://docs.getperga.me/docs/installation#update-perga"
fi

docker compose up -d

echo "Done! You can access Perga now:"
print_link "Web UI" "http://localhost:3000"
print_link "API docs" "http://localhost:8000/docs"

echo "To stop Perga, run: docker compose down"
echo "To view logs, run:  docker compose logs -f"
