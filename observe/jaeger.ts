import * as kubernetes from "@pulumi/kubernetes";
import * as kube from "../cluster/kube";
import * as traefik from "./traefik";

export class JaegerOperator {
    namespace: string;
    name: string;

    jaegerCrd: kubernetes.apiextensions.v1beta1.CustomResourceDefinition;

    serviceAccount: kubernetes.core.v1.ServiceAccount;
    clusterRole: kubernetes.rbac.v1.ClusterRole;
    clusterRoleBinding: kubernetes.rbac.v1.ClusterRoleBinding;
    authDelegatorClusterRoleBinding: kubernetes.rbac.v1.ClusterRoleBinding;
    deployment: kubernetes.apps.v1.Deployment;

    constructor(namespace: string, name: string) {
        this.namespace = namespace;
        this.name = name;
    }

    apply(provider: kubernetes.Provider) {
        this.jaegerCrd = this.applyJaegerCrd(provider);

        this.serviceAccount = kube.applyServiceAccount(this.namespace, this.name, provider);
        this.clusterRole = this.applyClusterRole(provider);
        this.clusterRoleBinding = kube.applyClusterRoleBinding(this.namespace, this.name, this.clusterRole, this.serviceAccount, provider);
        this.authDelegatorClusterRoleBinding = this.applyAuthDelegatorClusterRoleBinding(provider);
        this.deployment = this.applyDeployment(provider);
    }

    applyJaegerCrd(provider: kubernetes.Provider): kubernetes.apiextensions.v1beta1.CustomResourceDefinition {
        return new kubernetes.apiextensions.v1beta1.CustomResourceDefinition(`${this.name}-${jaegerName}`, {
            metadata: {
                name: jaegerName
            },
            spec: {
                group: jaegerGroup,
                version: jaegerVersion,
                names: {
                    kind: jaegerKind,
                    plural: jaegerPlural,
                    singular: jaegerSingular,
                },
                scope: "Namespaced"
            }
        }, {provider: provider});
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
                        "pods",
                        "services",
                        "endpoints",
                        "persistentvolumeclaims",
                        "events",
                        "configmaps",
                        "secrets",
                        "serviceaccounts"
                    ],
                    verbs: [
                        "*",
                    ]
                },
                {
                    apiGroups: [
                        "apps"
                    ],
                    resources: [
                        "deployments",
                        "daemonsets",
                        "replicasets",
                        "statefulsets"
                    ],
                    verbs: [
                        "*",
                    ]
                },
                {
                    apiGroups: [
                        "monitoring.coreos.com"
                    ],
                    resources: [
                        "servicemonitors"
                    ],
                    verbs: [
                        "get",
                        "create"
                    ]
                },
                {
                    apiGroups: [
                        "extensions"
                    ],
                    resources: [
                        "replicasets",
                        "deployments",
                        "daemonsets",
                        "statefulsets",
                        "ingresses"
                    ],
                    verbs: [
                        "*"
                    ]
                },
                {
                    apiGroups: [
                        "batch"
                    ],
                    resources: [
                        "jobs",
                        "cronjobs"
                    ],
                    verbs: [
                        "*"
                    ]
                },
                {
                    apiGroups: [
                        "route.openshift.io"
                    ],
                    resources: [
                        "routes"
                    ],
                    verbs: [
                        "*"
                    ]
                },
                {
                    apiGroups: [
                        "logging.openshift.io"
                    ],
                    resources: [
                        "elasticsearches"
                    ],
                    verbs: [
                        "*"
                    ]
                },
                {
                    apiGroups: [
                        "jaegertracing.io"
                    ],
                    resources: [
                        "*"
                    ],
                    verbs: [
                        "*"
                    ]
                },
                {
                    apiGroups: [
                        "rbac.authorization.k8s.io"
                    ],
                    resources: [
                        "clusterrolebindings"
                    ],
                    verbs: [
                        "*"
                    ]
                },
                {
                    apiGroups: [
                        "apps",
                        "extensions"
                    ],
                    resourceNames: [
                        this.name,
                    ],
                    resources: [
                        "deployments/finalizers"
                    ],
                    verbs: [
                        "update"
                    ]
                },
                {
                    apiGroups: [
                        "kafka.strimzi.io"
                    ],
                    resources: [
                        "kafkas",
                        "kafkausers"
                    ],
                    verbs: [
                        "*"
                    ]
                },
            ]
        }, {provider: provider});
    }

    applyAuthDelegatorClusterRoleBinding(provider: kubernetes.Provider): kubernetes.rbac.v1.ClusterRoleBinding {
        return new kubernetes.rbac.v1.ClusterRoleBinding(`${this.name}-auth-delegator`, {
            metadata: {
                name: `${this.name}-auth-delegator`,
                namespace: this.namespace
            },
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "ClusterRole",
                name: "system:auth-delegator"
            },
            subjects: [
                {
                    kind: this.serviceAccount.kind,
                    name: this.serviceAccount.metadata.name,
                    namespace: this.serviceAccount.metadata.namespace,
                }
            ]
        }, {provider: provider });
    }

    applyDeployment(provider: kubernetes.Provider): kubernetes.apps.v1.Deployment {
        return new kubernetes.apps.v1.Deployment(this.name, {
            metadata: {
                name: this.name,
                namespace: this.namespace,
                labels: {
                    "app.kubernetes.io/name": this.name
                },
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
                                image: "jaegertracing/jaeger-operator:1.15.1",
                                imagePullPolicy: "Always",
                                args: [
                                    "start"
                                ],
                                ports: [
                                    {
                                        name: "metrics",
                                        containerPort: 8383,
                                    }
                                ],
                                env: [
                                    {
                                        name: "WATCH_NAMESPACE",
                                        value: "",
                                    },
                                    {
                                        name: "POD_NAME",
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: "metadata.name"
                                            }
                                        }
                                    },
                                    {
                                        name: "POD_NAMESPACE",
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: "metadata.namespace"
                                            }
                                        }
                                    },
                                    {
                                        name: "OPERATOR_NAME",
                                        value: this.name,
                                    }
                                ]
                            },
                            {
                                name: "agent",
                                image: "jaegertracing/jaeger-agent:1.15.1",
                                args: [
                                    "--reporter.grpc.host-port=dns:///jaeger-collector-headless.$(POD_NAMESPACE).svc.cluster.local:14250"
                                ],
                                ports: [
                                    {
                                        name: "jg-compact-trft",
                                        containerPort: 6831,
                                        protocol: "UDP"
                                    }
                                ],
                                env: [
                                    {
                                        name: "POD_NAMESPACE",
                                        valueFrom: {
                                            fieldRef: {
                                                fieldPath: "metadata.namespace"
                                            }
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                },
            }

        }, {provider: provider})
    }
}

export const jaegerGroup    = "jaegertracing.io";
export const jaegerVersion  = "v1";
export const jaegerKind     = "Jaeger";
export const jaegerPlural   = "jaegers";
export const jaegerSingular = "jaeger";
export const jaegerName     = `${jaegerPlural}.${jaegerGroup}`;

export class JaegerInstance {
    namespace: string;
    name: string;
    host: string;

    jaeger: kubernetes.apiextensions.CustomResource;
    ingressRoute: kubernetes.apiextensions.CustomResource;

    constructor(namespace: string, name: string, host: string) {
        this.namespace = namespace;
        this.name = name;
        this.host = host;
    }

    apply(provider: kubernetes.Provider) {
        this.jaeger = this.applyJaeger(provider);
        this.ingressRoute = this.applyIngressRoute(this.host, provider);
    }

    applyJaeger(provider: kubernetes.Provider): kubernetes.apiextensions.CustomResource {
        return new kubernetes.apiextensions.CustomResource(this.name, {
            apiVersion: `${jaegerGroup}/${jaegerVersion}`,
            kind: jaegerKind,
            metadata: {
                name: this.name,
                namespace: this.namespace,
            },
            spec: {
                strategy: "allInOne",
                annotations: {
                    "scheduler.alpha.kubernetes.io/critical-pod": ""
                },
                allInOne: {
                    image: "jaegertracing/all-in-one:latest",
                    options: {
                        "log-level": "debug",
                    }
                },
                storage: {
                    type: "memory",
                    options: {
                        memory: {
                            "max-traces": 100000
                        }
                    }
                },
                ingress: {
                    enabled: false
                },
                agent: {
                    strategy: "DaemonSet"
                }
            }
        }, { provider: provider })
    }

    applyIngressRoute(host: string, provider: kubernetes.Provider): kubernetes.apiextensions.CustomResource {
        const matcher = "Host(`"+host+"`) && PathPrefix(`/`)";

        return new kubernetes.apiextensions.CustomResource(this.name, {
            apiVersion: `${traefik.ingressRouteGroup}/${traefik.ingressRouteVersion}`,
            kind: traefik.ingressRouteKind,
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
                                name: `${this.name}-query`,
                                port: 16686
                            }
                        ]
                    }
                ]
            }
        }, { provider: provider });
    }
}
