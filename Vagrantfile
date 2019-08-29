# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.require_version ">= 2.2"

if ["up", "provision", "status"].include?(ARGV.first)
  require_relative "vagrant/ansible_galaxy_helper"

  AnsibleGalaxyHelper.install_dependent_roles("deployment/ansible")
end

ANSIBLE_GROUPS = {
  "app-servers" => [ "app" ],
  "services" => [ "services" ],
  "workers" => [ "worker" ],
  "tile-servers" => [ "tiler" ]
}

if !ENV["VAGRANT_ENV"].nil? && ENV["VAGRANT_ENV"] == "TEST"
  ANSIBLE_ENV_GROUPS = {
    "test:children" => [
      "app-servers", "services", "workers", "tile-servers"
    ]
  }
  VAGRANT_NETWORK_OPTIONS = { auto_correct: true }
else
  ANSIBLE_ENV_GROUPS = {
    "development:children" => [
      "app-servers", "services", "workers", "tile-servers"
    ]
  }
  VAGRANT_NETWORK_OPTIONS = { auto_correct: false }
end

Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-16.04"

  config.vm.define "services" do |services|
    services.vm.hostname = "services"
    services.vm.network "private_network", ip: ENV.fetch("MMW_SERVICES_IP", "33.33.34.30")

    # PostgreSQL
    services.vm.network "forwarded_port", {
      guest: 5432,
      host: 5432
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Redis
    services.vm.network "forwarded_port", {
      guest: 6379,
      host: 6379
    }.merge(VAGRANT_NETWORK_OPTIONS)

    services.vm.provider "virtualbox" do |v|
      v.customize ["guestproperty", "set", :id, "/VirtualBox/GuestAdd/VBoxService/--timesync-set-threshold", 10000 ]
      v.memory = 2048
    end

    services.vm.provision "ansible" do |ansible|
      ansible.compatibility_mode = "2.0"
      ansible.playbook = "deployment/ansible/services.yml"
      ansible.groups = ANSIBLE_GROUPS.merge(ANSIBLE_ENV_GROUPS)
      ansible.raw_arguments = ["--timeout=60"]
    end
  end

  config.vm.define "worker" do |worker|
    worker.vm.hostname = "worker"
    worker.vm.network "private_network", ip: ENV.fetch("MMW_WORKER_IP", "33.33.34.20")

    worker.vm.synced_folder "src/mmw", "/opt/app"

    # Path to RWD data (ex. /media/passport/rwd-nhd)
    worker.vm.synced_folder ENV.fetch("RWD_DATA", "/tmp"), "/opt/rwd-data"

    # AWS
    worker.vm.synced_folder "~/.aws", "/var/lib/mmw/.aws"

    # Docker
    worker.vm.network "forwarded_port", {
      guest: 2375,
      host: 2375
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Geoprocessing Service
    worker.vm.network "forwarded_port", {
      guest: 8090,
      host: 8090
    }.merge(VAGRANT_NETWORK_OPTIONS)

    worker.vm.provider "virtualbox" do |v|
      v.customize ["guestproperty", "set", :id, "/VirtualBox/GuestAdd/VBoxService/--timesync-set-threshold", 10000 ]
      v.memory = 2048
      v.cpus = 2
    end

    worker.vm.provision "ansible" do |ansible|
      ansible.compatibility_mode = "2.0"
      ansible.playbook = "deployment/ansible/workers.yml"
      ansible.groups = ANSIBLE_GROUPS.merge(ANSIBLE_ENV_GROUPS)
      ansible.raw_arguments = ["--timeout=60"]
    end
  end

  config.vm.define "app" do |app|
    app.vm.hostname = "app"
    app.vm.network "private_network", ip: ENV.fetch("MMW_APP_IP", "33.33.34.10")

    app.vm.synced_folder "src/mmw", "/opt/app"

    # Django via Nginx/Gunicorn
    app.vm.network "forwarded_port", {
      guest: 80,
      host: 8000
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Livereload server
    app.vm.network "forwarded_port", {
      guest: 35729,
      host: 35729,
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Testem server
    app.vm.network "forwarded_port", {
      guest: 7357,
      host: 7357
    }.merge(VAGRANT_NETWORK_OPTIONS)

    app.ssh.forward_x11 = true

    app.vm.provider "virtualbox" do |v|
      v.customize ["guestproperty", "set", :id, "/VirtualBox/GuestAdd/VBoxService/--timesync-set-threshold", 10000 ]
      v.memory = 2048
    end

    app.vm.provision "ansible" do |ansible|
      ansible.compatibility_mode = "2.0"
      ansible.playbook = "deployment/ansible/app-servers.yml"
      ansible.groups = ANSIBLE_GROUPS.merge(ANSIBLE_ENV_GROUPS)
      ansible.raw_arguments = ["--timeout=60"]
    end
  end

  config.vm.define "tiler" do |tiler|
    tiler.vm.hostname = "tiler"
    tiler.vm.network "private_network", ip: ENV.fetch("MMW_TILER_IP", "33.33.34.35")

    tiler.vm.synced_folder "src/tiler", "/opt/tiler"

    # Expose the tiler. Tiler is served by Nginx.
    tiler.vm.network "forwarded_port", {
      guest: 80,
      host: 4000
    }.merge(VAGRANT_NETWORK_OPTIONS)

    tiler.vm.provider "virtualbox" do |v|
      v.memory = 1024
    end

    tiler.vm.provision "ansible" do |ansible|
      ansible.compatibility_mode = "2.0"
      ansible.playbook = "deployment/ansible/tile-servers.yml"
      ansible.groups = ANSIBLE_GROUPS.merge(ANSIBLE_ENV_GROUPS)
      ansible.raw_arguments = ["--timeout=60"]
    end
  end
end
