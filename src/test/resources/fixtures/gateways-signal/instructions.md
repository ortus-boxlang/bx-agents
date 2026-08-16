# Gateways Signal Fixture

Used to test GatewayGenerator's push-style gateway wiring (Signal
registration via a bare class path, plus the generated
interceptors/GatewaySessionBootstrap.bx). Signal has no webhook route -
inbound arrives via an SSE connection to a signal-cli daemon, same shape
as Telegram's own long-poll gateway.
