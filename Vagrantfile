# DỰNG TỰ ĐỘNG CÁC MÁY ẢO BẰNG VAGRANT (phụ lục của tài liệu; phần chính hướng dẫn làm tay).
# Trước khi chạy, trên máy thật:  node tools/setup.js vm
#   vagrant up gateway node1 node2 node3      → mạng 3 trường + gateway
#   vagrant up reader1                         → thêm 1 node chỉ đọc (mở rộng)
VMS = {
  "gateway" => ["192.168.56.10", nil],
  "node1"   => ["192.168.56.11", "node1"],
  "node2"   => ["192.168.56.12", "node2"],
  "node3"   => ["192.168.56.13", "node3"],
  "reader1" => ["192.168.56.21", "reader"],
  "reader2" => ["192.168.56.22", "reader"],
}

Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-24.04"
  config.vm.provider "virtualbox" do |vb|
    vb.memory = 512
    vb.cpus = 1
  end

  VMS.each do |name, (ip, data)|
    config.vm.define name, autostart: !name.start_with?("reader") do |m|
      m.vm.hostname = name
      m.vm.network "private_network", ip: ip
      # Gateway nhận MỌI request rồi chuyển tiếp nên cần mạnh hơn các node (đo thấy 1 CPU là nghẽn)
      m.vm.provider("virtualbox") { |vb| vb.cpus = 2 } if data.nil?
      if data.nil?
        # Gateway: nginx (cân bằng tải + phục vụ giao diện) và ab (đo tải)
        m.vm.provision "shell", inline: <<~SH
          apt-get update -q && apt-get install -y -q nginx apache2-utils
          mkdir -p /var/www/vb && cp -r /vagrant/web/. /var/www/vb/
          cp /vagrant/deploy/nginx-vb.conf /etc/nginx/sites-available/vb
          ln -sf /etc/nginx/sites-available/vb /etc/nginx/sites-enabled/vb
          rm -f /etc/nginx/sites-enabled/default
          nginx -t && systemctl reload nginx
        SH
      else
        # Node: cài Node.js 22, chép code + cấu hình của node này, chạy như một dịch vụ
        m.vm.provision "shell", inline: <<~SH
          command -v node || (curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y -q nodejs)
          mkdir -p /opt/vb/data/node && cp -r /vagrant/server /vagrant/web /opt/vb/
          cp /vagrant/data/#{data}/config.json /opt/vb/data/node/
          cp /vagrant/deploy/vb-node.service /etc/systemd/system/
          systemctl daemon-reload && systemctl enable vb-node && systemctl restart vb-node
        SH
      end
    end
  end
end
