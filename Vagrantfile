# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.require_version ">= 1.6"
require "yaml"

# Deserialize Ansible Galaxy installation metadata for a role
def galaxy_install_info(role_name)
  role_path = File.join("deployment", "ansible", "roles", role_name)
  galaxy_install_info = File.join(role_path, "meta", ".galaxy_install_info")

  if (File.directory?(role_path) || File.symlink?(role_path)) && File.exists?(galaxy_install_info)
    YAML.load_file(galaxy_install_info)
  else
    { install_date: "", version: "0.0.0" }
  end
end

# Uses the contents of roles.txt to ensure that ansible-galaxy is run
# if any dependencies are missing
def install_dependent_roles
  ansible_directory = File.join("deployment", "ansible")
  ansible_roles_txt = File.join(ansible_directory, "roles.txt")

  File.foreach(ansible_roles_txt) do |line|
    role_name, role_version = line.split(",")
    role_path = File.join(ansible_directory, "roles", role_name)
    galaxy_metadata = galaxy_install_info(role_name)

    if galaxy_metadata["version"] != role_version.strip
      unless system("ansible-galaxy install -f -r #{ansible_roles_txt} -p #{File.dirname(role_path)}")
        $stderr.puts "\nERROR: An attempt to install Ansible role dependencies failed."
        exit(1)
      end

      break
    end
  end
end

# Install missing role dependencies based on the contents of roles.txt
if [ "up", "provision", "status" ].include?(ARGV.first)
  install_dependent_roles
end

ANSIBLE_GROUPS = {
  "app-servers" => [ "app" ],
  "services" => [ "services" ],
  "workers" => [ "worker" ],
  "monitoring-servers" => [ "services" ]
}

if !ENV["VAGRANT_ENV"].nil? && ENV["VAGRANT_ENV"] == "TEST"
  ANSIBLE_ENV_GROUPS = {
    "test:children" => [
      "app-servers", "services", "workers"
    ]
  }
  VAGRANT_NETWORK_OPTIONS = { auto_correct: true }
else
  ANSIBLE_ENV_GROUPS = {
    "development:children" => [
      "app-servers", "services", "monitoring-servers", "workers"
    ]
  }
  VAGRANT_NETWORK_OPTIONS = { auto_correct: false }
end

VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "ubuntu/trusty64"

  # Wire up package caching:
  if Vagrant.has_plugin?("vagrant-cachier")
    config.cache.scope = :machine
  end

  config.vm.define "services" do |services|
    services.vm.hostname = "services"
    services.vm.network "private_network", ip: ENV.fetch("MMW_SERVICES_IP", "33.33.34.30")

    services.vm.synced_folder ".", "/vagrant", disabled: true

    # Graphite Web
    services.vm.network "forwarded_port", {
      guest: 8080,
      host: 8080
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Kibana
    services.vm.network "forwarded_port", {
      guest: 5601,
      host: 5601
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # PostgreSQL
    services.vm.network "forwarded_port", {
      guest: 5432,
      host: 5432
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Pgweb
    services.vm.network "forwarded_port", {
      guest: 5433,
      host: 5433
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Redis
    services.vm.network "forwarded_port", {
      guest: 6379,
      host: 6379
    }.merge(VAGRANT_NETWORK_OPTIONS)

    services.vm.provider "virtualbox" do |v|
      v.memory = 1024
    end

    services.vm.provision "ansible" do |ansible|
      ansible.playbook = "deployment/ansible/services.yml"
      ansible.groups = ANSIBLE_GROUPS.merge(ANSIBLE_ENV_GROUPS)
      ansible.raw_arguments = ["--timeout=60"]
    end
  end

  config.vm.define "worker" do |worker|
    worker.vm.hostname = "worker"
    worker.vm.network "private_network", ip: ENV.fetch("MMW_WORKER_IP", "33.33.34.20")

    worker.vm.synced_folder ".", "/vagrant", disabled: true

    if Vagrant::Util::Platform.windows? || Vagrant::Util::Platform.cygwin?
      worker.vm.synced_folder "src/mmw", "/opt/app/", type: "rsync", rsync__exclude: ["node_modules/", "apps/"]
      worker.vm.synced_folder "src/mmw/apps", "/opt/app/apps"
    else
      worker.vm.synced_folder "src/mmw", "/opt/app/"
    end

    worker.vm.provider "virtualbox" do |v|
      v.memory = 1024
    end

    worker.vm.provision "ansible" do |ansible|
      ansible.playbook = "deployment/ansible/workers.yml"
      ansible.groups = ANSIBLE_GROUPS.merge(ANSIBLE_ENV_GROUPS)
      ansible.raw_arguments = ["--timeout=60"]
    end
  end

  config.vm.define "app" do |app|
    app.vm.hostname = "app"
    app.vm.network "private_network", ip: ENV.fetch("MMW_APP_IP", "33.33.34.10")

    app.vm.synced_folder ".", "/vagrant", disabled: true

    if Vagrant::Util::Platform.windows? || Vagrant::Util::Platform.cygwin?
      app.vm.synced_folder "src/mmw", "/opt/app/", type: "rsync", rsync__exclude: ["node_modules/", "apps/"]
      app.vm.synced_folder "src/mmw/apps", "/opt/app/apps"
    else
      app.vm.synced_folder "src/mmw", "/opt/app/"
    end

    # Django via Nginx/Gunicorn
    app.vm.network "forwarded_port", {
      guest: 80,
      host: 8000
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Livereload server (for gulp watch)
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

    app.vm.provision "ansible" do |ansible|
      ansible.playbook = "deployment/ansible/app-servers.yml"
      ansible.groups = ANSIBLE_GROUPS.merge(ANSIBLE_ENV_GROUPS)
      ansible.raw_arguments = ["--timeout=60"]
    end
  end
end
