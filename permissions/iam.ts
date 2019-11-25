import * as aws from "@pulumi/aws";

export class ClusterRole {
    name: string;
    role: aws.iam.Role;

    constructor(name: string) {
        this.name = name;
    }

    apply() {
        this.role = new aws.iam.Role(this.name,{
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
                Service: "ec2.amazonaws.com",
            })
        });
    }

    attach(name: string, policyArn: string) {
        return new aws.iam.RolePolicyAttachment(`${this.name}-${name}`, {
            role: this.role.name,
            policyArn: policyArn
        });
    }
}

