Install Prometheus+Grafana (kube-prometheus-stack) via Helm:

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace monitoring
helm install kp-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set grafana.enabled=true

Wait until pods in monitoring namespace are Ready.
Port-forward Grafana: kubectl -n monitoring port-forward svc/kp-stack-grafana 3000:80
