module.exports = {
  apps: [{
    name: "admin-backend",
    script: 'index.js'
  },
  {
    name: "rabbitmq-consumer",
    script: "consumer.js",
    exec_mode: "cluster_mode",
    instances: "max"
  }
  ]
};

