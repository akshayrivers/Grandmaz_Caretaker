import {
  type RouteConfig,
  route,
  index,
} from "@react-router/dev/routes";

export default [
  index("./routes/home.tsx"),
  route("accept-invitation", "./routes/accept-invitation.tsx"),
  route("dashboard", "./routes/dashboard.tsx", [
    index("./routes/dashboard.home.tsx"),
    route("device/:deviceId", "./routes/dashboard.device.tsx"),
    route("commands", "./routes/dashboard.commands.tsx"),
    route("help", "./routes/dashboard.help.tsx"),
    route("audit", "./routes/dashboard.audit.tsx"),
    route("profile", "./routes/dashboard.profile.tsx"),
  route("home-setup", "./routes/dashboard.config.tsx"),
  route("sos", "./routes/dashboard.sos.tsx"),
  ]),
] satisfies RouteConfig;
