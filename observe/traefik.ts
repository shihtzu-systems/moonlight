import * as kubernetes from "@pulumi/kubernetes";
import * as kube from "../cluster/kube";

export class TraefikOperator {
    namespace: string;
    name: string;
    host: string;
    jaegerAgent: string;

    ingressRouteCrd: kubernetes.apiextensions.v1beta1.CustomResourceDefinition;
    ingressRouteTcpCrd: kubernetes.apiextensions.v1beta1.CustomResourceDefinition;
    middlewareCrd: kubernetes.apiextensions.v1beta1.CustomResourceDefinition;
    tlsOptionCrd: kubernetes.apiextensions.v1beta1.CustomResourceDefinition;

    serviceAccount: kubernetes.core.v1.ServiceAccount;
    clusterRole: kubernetes.rbac.v1.ClusterRole;
    clusterRoleBinding: kubernetes.rbac.v1.ClusterRoleBinding;
    deployment: kubernetes.apps.v1.Deployment;
    service: kubernetes.core.v1.Service;
    ingressRoute: kubernetes.apiextensions.CustomResource;

    constructor(namespace: string, name: string, host: string, jaegerAgent: string) {
        this.namespace = namespace;
        this.name = name;
        this.host = host;
        this.jaegerAgent = jaegerAgent;
    }

    apply(provider: kubernetes.Provider) {
        this.ingressRouteCrd = this.applyIngressRouteCrd(provider);
        this.ingressRouteTcpCrd = this.applyIngressRouteTcpCrd(provider);
        this.middlewareCrd = this.applyMiddlewareCrd(provider);
        this.tlsOptionCrd = this.applyTlsOptionCrd(provider);

        this.serviceAccount = kube.applyServiceAccount(this.namespace, this.name, provider);
        this.clusterRole = this.applyClusterRole(provider);
        this.clusterRoleBinding = kube.applyClusterRoleBinding(this.namespace, this.name, this.clusterRole, this.serviceAccount, provider);
        this.deployment = this.applyDeployment(provider);
        this.service = this.applyService(provider);
        this.ingressRoute = this.applyIngressRoute(this.host, provider);
    }

    applyIngressRouteCrd(provider: kubernetes.Provider): kubernetes.apiextensions.v1beta1.CustomResourceDefinition {
        return new kubernetes.apiextensions.v1beta1.CustomResourceDefinition(`${this.name}-${ingressRouteName}`, {
            metadata: {
                name: ingressRouteName
            },
            spec: {
                group: ingressRouteGroup,
                version: ingressRouteVersion,
                names: {
                    kind: ingressRouteKind,
                    plural: ingressRoutePlural,
                    singular: ingressRouteSingular,
                },
                scope: "Namespaced"
            }
        }, { provider: provider });
    }

    applyIngressRouteTcpCrd(provider: kubernetes.Provider): kubernetes.apiextensions.v1beta1.CustomResourceDefinition {
        return new kubernetes.apiextensions.v1beta1.CustomResourceDefinition(`${this.name}-${ingressRouteTcpName}`, {
            metadata: {
                name: ingressRouteTcpName
            },
            spec: {
                group: ingressRouteTcpGroup,
                version: ingressRouteTcpVersion,
                names: {
                    kind: ingressRouteTcpKind,
                    plural: ingressRouteTcpPlural,
                    singular: ingressRouteTcpSingular,
                },
                scope: "Namespaced"
            }
        }, { provider: provider });
    }

    applyMiddlewareCrd(provider: kubernetes.Provider): kubernetes.apiextensions.v1beta1.CustomResourceDefinition {
        return new kubernetes.apiextensions.v1beta1.CustomResourceDefinition(`${this.name}-${middlewareName}`, {
            metadata: {
                name: middlewareName
            },
            spec: {
                group: middlewareGroup,
                version: middlewareVersion,
                names: {
                    kind: middlewareKind,
                    plural: middlewarePlural,
                    singular: middlewareSingular,
                },
                scope: "Namespaced"
            }
        }, { provider: provider });
    }

    applyTlsOptionCrd(provider: kubernetes.Provider): kubernetes.apiextensions.v1beta1.CustomResourceDefinition {
        return new kubernetes.apiextensions.v1beta1.CustomResourceDefinition(`${this.name}-${tlsOptionName}`, {
            metadata: {
                name: tlsOptionName
            },
            spec: {
                group: tlsOptionGroup,
                version: tlsOptionVersion,
                names: {
                    kind: tlsOptionKind,
                    plural: tlsOptionPlural,
                    singular: tlsOptionSingular,
                },
                scope: "Namespaced"
            }
        }, { provider: provider });
    }

    applyClusterRole(provider: kubernetes.Provider): kubernetes.rbac.v1.ClusterRole {
        return new kubernetes.rbac.v1.ClusterRole(this.name, {
            metadata: {
                name: this.name,
                namespace: this.namespace
            },
            rules: [
                {
                    apiGroups: [
                        ""
                    ],
                    resources: [
                        "services",
                        "endpoints",
                        "secrets"
                    ],
                    verbs: [
                        "get",
                        "list",
                        "watch"
                    ]
                },
                {
                    apiGroups: [
                        "extensions"
                    ],
                    resources: [
                        "ingresses"
                    ],
                    verbs: [
                        "get",
                        "list",
                        "watch"
                    ]
                },
                {
                    apiGroups: [
                        "extensions"
                    ],
                    resources: [
                        "ingresses/status"
                    ],
                    verbs: [
                        "update"
                    ]
                },
                {
                    apiGroups: [
                        "traefik.containo.us"
                    ],
                    resources: [
                        "middlewares"
                    ],
                    verbs: [
                        "get",
                        "list",
                        "watch"
                    ]
                },
                {
                    apiGroups: [
                        "traefik.containo.us"
                    ],
                    resources: [
                        "ingressroutes"
                    ],
                    verbs: [
                        "get",
                        "list",
                        "watch"
                    ]
                },
                {
                    apiGroups: [
                        "traefik.containo.us"
                    ],
                    resources: [
                        "ingressroutetcps"
                    ],
                    verbs: [
                        "get",
                        "list",
                        "watch"
                    ]
                },
                {
                    apiGroups: [
                        "traefik.containo.us"
                    ],
                    resources: [
                        "tlsoptions"
                    ],
                    verbs: [
                        "get",
                        "list",
                        "watch"
                    ]
                }
            ]
        }, {provider: provider});
    }

    applyDeployment(provider: kubernetes.Provider): kubernetes.apps.v1.Deployment {
        return new kubernetes.apps.v1.Deployment(this.name, {
            metadata: {
                name: this.name,
                namespace: this.namespace,
            },
            spec: {
                replicas: 1,
                selector: {
                    matchLabels: {
                        "app.kubernetes.io/name": this.name
                    }
                },
                template: {
                    metadata: {
                        name: this.name,
                        namespace: this.namespace,
                        labels: {
                            "app.kubernetes.io/name": this.name
                        }
                    },
                    spec: {
                        serviceAccountName: this.serviceAccount.metadata.name,
                        containers: [
                            {
                                name: "main",
                                image: "traefik:v2.0",
                                args: [
                                    "--api.insecure",
                                    "--accesslog",
                                    "--entrypoints.web.Address=:8000",
                                    "--entrypoints.web.forwardedheaders.insecure=true",
                                    "--providers.kubernetescrd",
                                    "--ping",
                                    "--accesslog=true",
                                    "--log=true",
                                    "--tracing.jaeger=true",
                                    `--tracing.jaeger.samplingServerURL=http://${this.jaegerAgent}:5778/sampling`,
                                    `--tracing.jaeger.localAgentHostPort=${this.jaegerAgent}:6831`
                                ],
                                ports: [
                                    {
                                        name: "web",
                                        containerPort: 8000,
                                    },
                                    {
                                        name: "admin",
                                        containerPort: 8080,
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }, {provider: provider})
    }

    applyService(provider: kubernetes.Provider): kubernetes.core.v1.Service {
        return new kubernetes.core.v1.Service(this.name, {
            metadata: {
                name: this.name,
                namespace: this.namespace,
                labels: {
                    "app.kubernetes.io/name": this.name
                },
                annotations: {
                    "alb.ingress.kubernetes.io/healthcheck-path": "/ping",
                    "alb.ingress.kubernetes.io/healthcheck-port": "30103"
                }
            },
            spec: {
                selector: {
                    "app.kubernetes.io/name": this.name,
                },
                type: "NodePort",
                ports: [
                    {
                        protocol: "TCP",
                        name: "web",
                        port: this.deployment.spec.template.spec.containers[0].ports[0].containerPort,
                    },
                    {
                        protocol: "TCP",
                        name: "admin",
                        port: this.deployment.spec.template.spec.containers[0].ports[1].containerPort,
                        nodePort: 30103
                    }
                ]
            }
        }, { provider: provider })
    }

    applyIngressRoute(host: string, provider: kubernetes.Provider): kubernetes.apiextensions.CustomResource {
        const matcher = "Host(`"+host+"`) && PathPrefix(`/`)";

        return new kubernetes.apiextensions.CustomResource(this.name, {
            apiVersion: `${ingressRouteGroup}/${ingressRouteVersion}`,
            kind: ingressRouteKind,
            metadata: {
                name: this.name,
                namespace: this.namespace
            },
            spec: {
                entryPoints: [
                    "web"
                ],
                routes: [
                    {
                        match: matcher,
                        kind: "Rule",
                        priority: 1,
                        services: [
                            {
                                name: this.service.metadata.name,
                                port: this.service.spec.ports[1].port
                            }
                        ]
                    }
                ]
            }
        }, { provider: provider });
    }

}


export const ingressRouteGroup    = "traefik.containo.us";
export const ingressRouteVersion  = "v1alpha1";
export const ingressRouteKind     = "IngressRoute";
export const ingressRoutePlural   = "ingressroutes";
export const ingressRouteSingular = "ingressroute";
export const ingressRouteName     = `${ingressRoutePlural}.${ingressRouteGroup}`;

export const ingressRouteTcpGroup    = "traefik.containo.us";
export const ingressRouteTcpVersion  = "v1alpha1";
export const ingressRouteTcpKind     = "IngressRouteTCP";
export const ingressRouteTcpPlural   = "ingressroutetcps";
export const ingressRouteTcpSingular = "ingressroutetcp";
export const ingressRouteTcpName     = `${ingressRouteTcpPlural}.${ingressRouteTcpGroup}`;

export const middlewareGroup    = "traefik.containo.us";
export const middlewareVersion  = "v1alpha1";
export const middlewareKind     = "Middleware";
export const middlewarePlural   = "middlewares";
export const middlewareSingular = "middleware";
export const middlewareName     = `${middlewarePlural}.${middlewareGroup}`;

export const tlsOptionGroup    = "traefik.containo.us";
export const tlsOptionVersion  = "v1alpha1";
export const tlsOptionKind     = "TLSOption";
export const tlsOptionPlural   = "tlsoptions";
export const tlsOptionSingular = "tlsoption";
export const tlsOptionName     = `${tlsOptionPlural}.${tlsOptionGroup}`;
