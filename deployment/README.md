# 🚀 MockInterview.ai Deployment & Infrastructure

This directory contains the automated infrastructure-as-code (IaC) and deployment configurations for MockInterview.ai. We utilize a production-grade setup to ensure high availability and seamless session management for our AI-powered interviewers.

## 🏗️ Infrastructure as Code (Terraform)

All Google Cloud Platform (GCP) resources are provisioned using **Terraform**. This ensures the environment is reproducible, auditable, and secure.

### Key Resources Managed

- **Cloud Run**: Hosts the FastAPI backend with auto-scaling and high-concurrency support.
- **Vertex AI Endpoints**: Enables access to `gemini-live-2.5-flash-native-audio` and multimodal models.
- **IAM (Identity & Access Management)**: Least-privilege service accounts for secure API communication.
- **Cloud Storage / Artifact Registry**: Managed storage for interview logs and container images.

To initialize and apply the infrastructure:

```bash
cd deployment/terraform
terraform init
terraform apply -var-file=vars/env.tfvars -var project_id="YOUR_PROJECT_ID"
```

## 🚢 Continuous Deployment (Makefile)

Deployment is simplified into a single command through our root [Makefile](../Makefile). This script handles frontend builds, backend packaging, and Cloud Run revision updates.

To deploy the latest version to production:

```bash
make deploy
```

This command automatically:

1. Builds the React-based interviewer dashboard.
2. Packages the Python ADK backend.
3. Deploys to Google Cloud Run with pre-configured environment variables for Vertex AI and session persistence.

## 🎯 Hackathon Bonus: Automation

This directory serves as the evidence for automated cloud deployment.

- **Terraform Configs**: See the resource definitions in [deployment/terraform/](terraform/)
- **Automation Scripts**: See the `deploy` target in the project [Makefile](../Makefile)