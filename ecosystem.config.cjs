module.exports = {
  apps: [
    {
      name: "pm-api",
      cwd: "./apps/api",
      script: "dist/index.js",
      env: {
        NODE_ENV: "production"
      },
      max_memory_restart: "512M",
      error_file: "./logs/api-error.log",
      out_file: "./logs/api-out.log",
      merge_logs: true,
      time: true
    },
    {
      name: "pm-web",
      cwd: "./apps/web",
      script: "npm",
      args: "run start -- -p 3000",
      env: {
        NODE_ENV: "production"
      },
      max_memory_restart: "512M",
      error_file: "./logs/web-error.log",
      out_file: "./logs/web-out.log",
      merge_logs: true,
      time: true
    }
  ]
};
