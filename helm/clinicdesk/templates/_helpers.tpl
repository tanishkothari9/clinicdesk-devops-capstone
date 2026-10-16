{{- define "clinicdesk.fullname" -}}
{{- if contains .Chart.Name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{- define "clinicdesk.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end -}}

{{/* Selector labels for one component: include "clinicdesk.selectorLabels" (dict "ctx" $ "component" "backend") */}}
{{- define "clinicdesk.selectorLabels" -}}
app.kubernetes.io/name: {{ .ctx.Chart.Name }}
app.kubernetes.io/instance: {{ .ctx.Release.Name }}
app.kubernetes.io/component: {{ .component }}
app: {{ include "clinicdesk.fullname" .ctx }}-{{ .component }}
{{- end -}}

{{- define "clinicdesk.image" -}}
{{- $tag := required (printf "%s.image.tag is required (use the Git commit SHA)" .component) .image.tag -}}
{{- printf "%s:%s" .image.repository $tag -}}
{{- end -}}

{{- define "clinicdesk.postgresPassword" -}}
{{- if .Values.postgres.password -}}
{{- .Values.postgres.password -}}
{{- else -}}
{{- $existing := lookup "v1" "Secret" .Release.Namespace (printf "%s-postgres" (include "clinicdesk.fullname" .)) -}}
{{- if $existing -}}
{{- index $existing.data "POSTGRES_PASSWORD" | b64dec -}}
{{- else -}}
{{- randAlphaNum 24 -}}
{{- end -}}
{{- end -}}
{{- end -}}
