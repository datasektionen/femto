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
