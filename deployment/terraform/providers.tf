/**
 * Terraform Providers
 * Configures the Google Cloud and other required providers for infrastructure deployment.
 */
terraform {
  required_version = ">= 1.0.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.13.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7.0"
    }
  }
}

provider "google" {
  alias                 = "dev_billing_override"
  billing_project       = var.project_id
  region = var.region
  user_project_override = true
}
