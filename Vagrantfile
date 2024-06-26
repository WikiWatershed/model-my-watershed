# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.require_version ">= 2.2"

# Install vagrant-disksize to allow resizing the services VM.
unless Vagrant.has_plugin?("vagrant-disksize")
  raise  Vagrant::Errors::VagrantError.new, "vagrant-disksize plugin is missing. Please install it using 'vagrant plugin install vagrant-disksize' and rerun 'vagrant up'"
end

ANSIBLE_VERSION = "2.10.*"
PYTHON_INSTALL_CMD = %Q{
  sudo add-apt-repository ppa:deadsnakes/ppa && \
  sudo apt-get update && \
  sudo apt-get install -y \
    software-properties-common \
    python3.10 \
    python3.10-apt \
    python3.10-dev \
    python3.10-distutils && \
  sudo rm -f /usr/bin/python3 && \
  sudo ln -s /usr/bin/python3.10 /usr/bin/python3 && \
  curl -sS https://bootstrap.pypa.io/get-pip.py | sudo python3
}

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

MMW_EXTRA_VARS = {
  django_test_database: ENV["MMW_TEST_DB_NAME"] || "test_mmw",
  services_ip: ENV["MMW_SERVICES_IP"] || "33.33.34.30",
  tiler_host: ENV["MMW_TILER_IP"] || "33.33.34.35",
  itsi_secret_key: ENV["MMW_ITSI_SECRET_KEY"],
  concord_secret_key: ENV["MMW_CONCORD_SECRET_KEY"],
  hydroshare_secret_key: ENV["MMW_HYDROSHARE_SECRET_KEY"],
  srat_catchment_api_key: ENV["MMW_SRAT_CATCHMENT_API_KEY"],
  tilecache_bucket_name: ENV["MMW_TILECACHE_BUCKET"] || "",
}

Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-20.04"

  config.vm.define "services" do |services|
    services.vm.hostname = "services"
    services.vm.network "private_network", ip: ENV["MMW_SERVICES_IP"] || "33.33.34.30"
    services.disksize.size = '64GB'

    # PostgreSQL
    services.vm.network "forwarded_port", **{
      guest: 5432,
      host: 5432
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Redis
    services.vm.network "forwarded_port", **{
      guest: 6379,
      host: 6379
    }.merge(VAGRANT_NETWORK_OPTIONS)

    services.vm.provider "virtualbox" do |v|
      v.customize ["guestproperty", "set", :id, "/VirtualBox/GuestAdd/VBoxService/--timesync-set-threshold", 10000 ]
      v.memory = 4096
      v.cpus = 4
    end

    services.vm.provision "ansible_local" do |ansible|
      ansible.compatibility_mode = "2.0"
      ansible.install_mode = "pip_args_only"
      ansible.pip_install_cmd = PYTHON_INSTALL_CMD
      ansible.pip_args = "ansible==#{ANSIBLE_VERSION}"
      ansible.playbook = "deployment/ansible/services.yml"
      ansible.groups = ANSIBLE_GROUPS.merge(ANSIBLE_ENV_GROUPS)
      ansible.raw_arguments = ["--timeout=60"]
      ansible.extra_vars = MMW_EXTRA_VARS
    end

    services.vm.provision "shell" do |s|
      # The base box we use comes with a ~30GB disk. The physical disk is
      # expanded to 64GB above using vagrant-disksize. The logical disk and
      # the file system need to be expanded as well to make full use of the
      # space. `lvextend` expands the logical disk, and `resize2fs` expands
      # the files system.
      s.inline = <<-SHELL
        sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
        sudo resize2fs /dev/mapper/ubuntu--vg-ubuntu--lv
      SHELL
    end
  end

  config.vm.define "worker" do |worker|
    worker.vm.hostname = "worker"
    worker.vm.network "private_network", ip: ENV["MMW_WORKER_IP"] || "33.33.34.20"

    worker.vm.synced_folder "src/mmw", "/opt/app"
    # Facilitates the sharing of Django media root directories across virtual machines.
    worker.vm.synced_folder ".vagrant/machines/app/virtualbox/media", "/tmp/media",
      create: true

    # Path to RWD data (ex. /media/passport/rwd-nhd)
    worker.vm.synced_folder ENV["RWD_DATA"] || "/tmp", "/opt/rwd-data"

    # AWS
    worker.vm.synced_folder "~/.aws", "/var/lib/mmw/.aws"

    # Docker
    worker.vm.network "forwarded_port", **{
      guest: 2375,
      host: 2375
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Geoprocessing Service
    worker.vm.network "forwarded_port", **{
      guest: 8090,
      host: 8090
    }.merge(VAGRANT_NETWORK_OPTIONS)

    worker.vm.provider "virtualbox" do |v|
      v.customize ["guestproperty", "set", :id, "/VirtualBox/GuestAdd/VBoxService/--timesync-set-threshold", 10000 ]
      v.memory = 2048
      v.cpus = 2
    end

    worker.vm.provision "ansible_local" do |ansible|
      ansible.compatibility_mode = "2.0"
      ansible.install_mode = "pip_args_only"
      ansible.pip_install_cmd = PYTHON_INSTALL_CMD
      ansible.pip_args = "ansible==#{ANSIBLE_VERSION}"
      ansible.playbook = "deployment/ansible/workers.yml"
      ansible.groups = ANSIBLE_GROUPS.merge(ANSIBLE_ENV_GROUPS)
      ansible.raw_arguments = ["--timeout=60"]
      ansible.extra_vars = MMW_EXTRA_VARS
    end
  end

  config.vm.define "app" do |app|
    app.vm.hostname = "app"
    app.vm.network "private_network", ip: ENV["MMW_APP_IP"] || "33.33.34.10"

    app.vm.synced_folder "src/mmw", "/opt/app"
    # Facilitates the sharing of Django media root directories across virtual machines.
    app.vm.synced_folder ".vagrant/machines/app/virtualbox/media", "/var/www/mmw/media",
      create: true, mount_options: ["dmode=777"]

    # Django via Nginx/Gunicorn
    app.vm.network "forwarded_port", **{
      guest: 80,
      host: 8000
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Livereload server
    app.vm.network "forwarded_port", **{
      guest: 35729,
      host: 35729,
    }.merge(VAGRANT_NETWORK_OPTIONS)
    # Testem server
    app.vm.network "forwarded_port", **{
      guest: 7357,
      host: 7357
    }.merge(VAGRANT_NETWORK_OPTIONS)

    app.ssh.forward_x11 = true

    app.vm.provider "virtualbox" do |v|
      v.customize ["guestproperty", "set", :id, "/VirtualBox/GuestAdd/VBoxService/--timesync-set-threshold", 10000 ]
      v.memory = 2048
    end

    app.vm.provision "ansible_local" do |ansible|
      ansible.compatibility_mode = "2.0"
      ansible.install_mode = "pip_args_only"
      ansible.pip_install_cmd = PYTHON_INSTALL_CMD
      ansible.pip_args = "ansible==#{ANSIBLE_VERSION}"
      ansible.playbook = "deployment/ansible/app-servers.yml"
      ansible.groups = ANSIBLE_GROUPS.merge(ANSIBLE_ENV_GROUPS)
      ansible.raw_arguments = ["--timeout=60"]
      ansible.extra_vars = MMW_EXTRA_VARS
    end
  end

  config.vm.define "tiler" do |tiler|
    tiler.vm.hostname = "tiler"
    tiler.vm.network "private_network", ip: ENV["MMW_TILER_IP"] || "33.33.34.35"

    tiler.vm.synced_folder "src/tiler", "/opt/tiler"

    # Expose the tiler. Tiler is served by Nginx.
    tiler.vm.network "forwarded_port", **{
      guest: 80,
      host: 4000
    }.merge(VAGRANT_NETWORK_OPTIONS)

    tiler.vm.provider "virtualbox" do |v|
      v.memory = 1024
    end

    tiler.vm.provision "ansible_local" do |ansible|
      ansible.compatibility_mode = "2.0"
      ansible.install_mode = "pip_args_only"
      ansible.pip_install_cmd = PYTHON_INSTALL_CMD
      ansible.pip_args = "ansible==#{ANSIBLE_VERSION}"
      ansible.playbook = "deployment/ansible/tile-servers.yml"
      ansible.groups = ANSIBLE_GROUPS.merge(ANSIBLE_ENV_GROUPS)
      ansible.raw_arguments = ["--timeout=60"]
      ansible.extra_vars = MMW_EXTRA_VARS
    end
  end
end
