variable "region" {
  default = "us-west-2"
}

variable "region_name" {
  description = "Name of the region"
}

variable "cluster_name" {
  description = "Name of the cluster"
}

variable "key_name" {
  description = "Name of the key-pair to use for instances"
}

variable "vpc_network_address" {
  description = "The address for the vpc"
}

variable "private_key_path" {
  description = "Path to the key to use when ssh into instance"
}

variable "kubeadm_token" {
  description = "Bootstrap token to use for kubeadm in the form of [a-z0-9]{6}.[a-z0-9]{16}"
  type        = string
}

variable "ssh_home_cidr" {
  description = "IP CIDR for home to allow ssh into the bastion"
}

variable "ssh_remote_cidr" {
  description = "IP CIDR for remote location to allow ssh into the bastion"
}

variable "key_pair_pem_source" {}
variable "key_pair_pem_destination" {}
