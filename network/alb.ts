import * as aws from "@pulumi/aws";
import * as kubernetes from "@pulumi/kubernetes";

import * as kube from "../cluster/kube";

export class AlbIngressController {
    namespace: string;
    name: string;
    clusterName: string;

    serviceAccount: kubernetes.core.v1.ServiceAccount;
    clusterRole: kubernetes.rbac.v1.ClusterRole;
    clusterRoleBinding: kubernetes.rbac.v1.ClusterRoleBinding;
    deployment: kubernetes.apps.v1.Deployment;

    constructor(namespace: string, name: string, clusterName: string) {
        this.namespace = namespace;
        this.name = name;
        this.clusterName = clusterName;
    }

    apply(provider: kubernetes.Provider) {
        this.serviceAccount = kube.applyServiceAccount(this.namespace, this.name, provider);
        this.clusterRole = this.applyClusterRole(provider);
        this.clusterRoleBinding = kube.applyClusterRoleBinding(this.namespace, this.name, this.clusterRole, this.serviceAccount, provider);
        this.deployment = this.applyDeployment(provider)
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
                        "",
                        "extensions",
                    ],
                    resources: [
                        "configmaps",
                        "endpoints",
                        "events",
                        "ingresses",
                        "ingresses/status",
                        "services",
                    ],
                    verbs: [
                        "create",
                        "get",
                        "list",
                        "update",
                        "watch",
                        "patch",
                    ]
                },
                {
                    apiGroups: [
                        "",
                        "extensions",
                    ],
                    resources: [
                        "nodes",
                        "pods",
                        "secrets",
                        "services",
                        "namespaces",
                    ],
                    verbs: [
                        "get",
                        "list",
                        "watch",
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
                labels: {
                    "app.kubernetes.io/name": this.name
                }
            },
            spec: {
                selector: {
                    matchLabels: {
                        "app.kubernetes.io/name": this.name
                    }
                },
                template: {
                    metadata: {
                        labels: {
                            "app.kubernetes.io/name": this.name
                        }
                    },
                    spec: {
                        serviceAccountName: this.serviceAccount.metadata.name,
                        containers: [
                            {
                                name: "main",
                                image: "docker.io/amazon/aws-alb-ingress-controller:v1.1.3",
                                args: [
                                    "--ingress-class=alb",
                                    `--cluster-name=${this.clusterName}`,
                                    "--aws-api-debug=true",
                                ]
                            }
                        ]
                    }
                }
            }
        }, {provider: provider});
    }

    applyIngressProxy(proxy: kubernetes.core.v1.Service, provider: kubernetes.Provider): kubernetes.networking.v1beta1.Ingress {
        return new kubernetes.networking.v1beta1.Ingress(this.name, {
            metadata: {
                name: this.name,
                annotations: {
                    "kubernetes.io/ingress.class": "alb",
                    "alb.ingress.kubernetes.io/scheme": "internet-facing",
                    "alb.ingress.kubernetes.io/listen-ports": `[{"HTTP": 80, "HTTPS": 443}]`,
                    "alb.ingress.kubernetes.io/actions.ssl-redirect": `{"Type": "redirect", "RedirectConfig": { "Protocol": "HTTPS", "Port": "443", "StatusCode": "HTTP_301"}}`
                }
            },
            spec: {
                rules: [
                    {
                        host: "*.shihtzu.io",
                        http: {
                            paths: [
                                {
                                    path: "/*",
                                    backend: {
                                        serviceName: "ssl-redirect",
                                        servicePort: "use-annotation"
                                    }
                                },
                                {
                                    path: "/*",
                                    backend: {
                                        serviceName: proxy.metadata.name,
                                        servicePort: proxy.spec.ports[0].name
                                    }
                                }
                            ]
                        }
                    },
                    {
                        host: "*.bright.pub",
                        http: {
                            paths: [
                                {
                                    path: "/*",
                                    backend: {
                                        serviceName: "ssl-redirect",
                                        servicePort: "use-annotation"
                                    }
                                },
                                {
                                    path: "/*",
                                    backend: {
                                        serviceName: proxy.metadata.name,
                                        servicePort: proxy.spec.ports[0].name
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        }, {provider: provider});
    }

    applyIamPolicy(): aws.iam.Policy {
        const policy: aws.iam.PolicyDocument = {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: [
                        "acm:DescribeCertificate",
                        "acm:ListCertificates",
                        "acm:GetCertificate"
                    ],
                    Effect: "Allow",
                    Resource: '*'
                },
                {
                    Action: [
                        "ec2:AuthorizeSecurityGroupIngress",
                        "ec2:CreateSecurityGroup",
                        "ec2:CreateTags",
                        "ec2:DeleteTags",
                        "ec2:DeleteSecurityGroup",
                        "ec2:DescribeAccountAttributes",
                        "ec2:DescribeAddresses",
                        "ec2:DescribeInstances",
                        "ec2:DescribeInstanceStatus",
                        "ec2:DescribeInternetGateways",
                        "ec2:DescribeNetworkInterfaces",
                        "ec2:DescribeSecurityGroups",
                        "ec2:DescribeSubnets",
                        "ec2:DescribeTags",
                        "ec2:DescribeVpcs",
                        "ec2:ModifyInstanceAttribute",
                        "ec2:ModifyNetworkInterfaceAttribute",
                        "ec2:RevokeSecurityGroupIngress"
                    ],
                    Effect: "Allow",
                    Resource: '*'
                },
                {
                    Action: [
                        "elasticloadbalancing:AddListenerCertificates",
                        "elasticloadbalancing:AddTags",
                        "elasticloadbalancing:CreateListener",
                        "elasticloadbalancing:CreateLoadBalancer",
                        "elasticloadbalancing:CreateRule",
                        "elasticloadbalancing:CreateTargetGroup",
                        "elasticloadbalancing:DeleteListener",
                        "elasticloadbalancing:DeleteLoadBalancer",
                        "elasticloadbalancing:DeleteRule",
                        "elasticloadbalancing:DeleteTargetGroup",
                        "elasticloadbalancing:DeregisterTargets",
                        "elasticloadbalancing:DescribeListenerCertificates",
                        "elasticloadbalancing:DescribeListeners",
                        "elasticloadbalancing:DescribeLoadBalancers",
                        "elasticloadbalancing:DescribeLoadBalancerAttributes",
                        "elasticloadbalancing:DescribeRules",
                        "elasticloadbalancing:DescribeSSLPolicies",
                        "elasticloadbalancing:DescribeTags",
                        "elasticloadbalancing:DescribeTargetGroups",
                        "elasticloadbalancing:DescribeTargetGroupAttributes",
                        "elasticloadbalancing:DescribeTargetHealth",
                        "elasticloadbalancing:ModifyListener",
                        "elasticloadbalancing:ModifyLoadBalancerAttributes",
                        "elasticloadbalancing:ModifyRule",
                        "elasticloadbalancing:ModifyTargetGroup",
                        "elasticloadbalancing:ModifyTargetGroupAttributes",
                        "elasticloadbalancing:RegisterTargets",
                        "elasticloadbalancing:RemoveListenerCertificates",
                        "elasticloadbalancing:RemoveTags",
                        "elasticloadbalancing:SetIpAddressType",
                        "elasticloadbalancing:SetSecurityGroups",
                        "elasticloadbalancing:SetSubnets",
                        "elasticloadbalancing:SetWebACL"
                    ],
                    Effect: "Allow",
                    Resource: '*'
                },
                {
                    Action: [
                        "iam:CreateServiceLinkedRole",
                        "iam:GetServerCertificate",
                        "iam:ListServerCertificates"
                    ],
                    Effect: "Allow",
                    Resource: '*'
                },
                {
                    Action: [
                        "cognito-idp:DescribeUserPoolClient"
                    ],
                    Effect: "Allow",
                    Resource: '*'
                },
                {
                    Action: [
                        "waf-regional:GetWebACLForResource",
                        "waf-regional:GetWebACL",
                        "waf-regional:AssociateWebACL",
                        "waf-regional:DisassociateWebACL"
                    ],
                    Effect: "Allow",
                    Resource: '*'
                },
                {
                    Action: [
                        "tag:GetResources",
                        "tag:TagResources"
                    ],
                    Effect: "Allow",
                    Resource: '*'
                },
                {
                    Action: [
                        "waf:GetWebACL"
                    ],
                    Effect: "Allow",
                    Resource: '*'
                }
            ]
        };
        return new aws.iam.Policy(this.name, {
            name: this.name,
            policy: JSON.stringify(policy),
        })
    }
}
