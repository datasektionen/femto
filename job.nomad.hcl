variable "domain_name" {
  type    = string
  default = "femto.betasektionen.se"
}

job "femto" {
  type = "service"

  group "femto" {
    network {
      port "backend" { }
      port "admin-frontend" {
        to = 80 # hardcoded
      }
    }

    service {
      name     = "femto"
      port     = "backend"
      provider = "nomad"
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.femto.rule=Host(`${var.domain_name}`)||Host(`www.${var.domain_name}`)",
        "traefik.http.routers.femto.tls.certresolver=default",
      ]
    }

    service {
      name     = "femto-admin"
      port     = "admin-frontend"
      provider = "nomad"
      tags = [
        "traefik.enable=true",
        "traefik.http.routers.femto-admin.rule=Host(`admin.${var.domain_name}`)",
        "traefik.http.routers.femto-admin.tls.certresolver=default",
      ]
    }

    task "femto" {
      driver = "docker"

      config {
        image = var.backend_image_tag
        ports = ["backend"]
      }

      template {
        data        = <<ENV
PORT={{ env "NOMAD_PORT_backend" }}
POSTGRES_HOST=postgres.dsekt.internal
POSTGRES_PORT=5432
POSTGRES_DB=femto-dev
POSTGRES_USER=femto-dev
{{ with nomadVar "nomad/jobs/femto" }}
POSTGRES_PASSWORD={{ .db_password }}
CLIENT_ID={{ .oidc_client_id }} # rename to OIDC_
CLIENT_SECRET={{ .oidc_client_secret }} # rename to OIDC_
# add these two
# JWT_SECRET={{generate your own}}
# HIVE_API_KEY={{ .whatever }}
{{ end }}
OIDC_ISSUER=https://sso.datasektionen.se
REDIRECT_URI=https://admin.${var.domain_name}/auth/oidc-callback # no longer used
API_KEY=4798016ff562e7b008d2ea3dcc0158687b53a247092d9317dc74a3f569aae48a # no longer used
API_URL=https://${var.domain_name}
CLIENT_URL=https://admin.${var.domain_name}
ENV
        destination = "local/.env"
        env         = true
      }

      resources {
        memory = 256
        cpu    = 100
      }
    }

    task "femto-admin" {
      driver = "docker"

      config {
        image = var.admin_image_tag
        ports = ["admin-frontend"]
      }
    }
  }
}

variable "backend_image_tag" {
  type    = string
  default = "ghcr.io/datasektionen/femto-backend:latest"
}

variable "admin_image_tag" {
  type    = string
  default = "ghcr.io/datasektionen/femto-admin:latest"
}
