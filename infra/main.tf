/*
  Terraform skeleton to create a minimal EC2 instance for learning.
  Replace placeholders and review before apply. This is educational example only.
*/
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "region" {
  type    = string
  default = "ap-northeast-1"
}

variable "instance_type" {
  type    = string
  default = "t3.micro"
}

variable "ami" {
  type    = string
  default = "ami-0c94855ba95c71c99" # placeholder (replace with region-appropriate AMI)
}

resource "aws_security_group" "allow_http_ssh" {
  name        = "aws-weather-sg"
  description = "Allow SSH and HTTP"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "web" {
  ami                    = var.ami
  instance_type          = var.instance_type
  vpc_security_group_ids = [aws_security_group.allow_http_ssh.id]
  key_name               = var.key_name

  tags = {
    Name = "aws-weather-ec2"
  }
}

variable "key_name" {
  type = string
}

output "instance_id" {
  value = aws_instance.web.id
}

output "public_ip" {
  value = aws_instance.web.public_ip
}
