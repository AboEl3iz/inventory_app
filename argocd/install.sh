#!/bin/bash
# =============================================================================
# ArgoCD Installation & Setup Script (Minikube)
# =============================================================================
set -e

echo "🚀 Installing ArgoCD on Minikube..."

# 1. Create namespace
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

# 2. Install ArgoCD
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 3. Wait for ArgoCD server to be ready
echo "⏳ Waiting for ArgoCD server to be ready (this may take a minute)..."
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=300s

# 4. Apply the application manifest (GitOps sync config)
# Ensure the path points to your application.yaml
echo "📦 Applying inventory-app ArgoCD Application..."
# Apply from the local argocd folder
kubectl apply -f application.yaml

# 5. Get initial admin password
echo "🔑 Fetching ArgoCD admin password..."
ARGOCD_PASS=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

echo ""
echo "✅ ArgoCD Installed Successfully!"
echo "--------------------------------------------------------"
echo "Username: admin"
echo "Password: $ARGOCD_PASS"
echo "--------------------------------------------------------"
echo "To access the UI, run:"
echo "kubectl port-forward svc/argocd-server -n argocd 8080:443"
echo "Then visit https://localhost:8080"
