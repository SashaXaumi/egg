# protobuf/

`ei.proto` is the reverse-engineered wire-format definition for the Egg, Inc. game API. It's the single source of truth for everything the client encodes/decodes against `https://www.auxbrain.com/`.

This fork tracks the version maintained in [carpetsage/egg](https://github.com/carpetsage/egg). When the game ships a new version that breaks the dashboard, sync this file from upstream:

```bash
git fetch upstream
git show upstream/main:protobuf/ei.proto > protobuf/ei.proto
make -C lib   # regenerates lib/proto/index.{js,d.ts}
```

Then bump the client identity constants in `lib/api/version.ts` (`APP_VERSION`, `APP_BUILD`, `CLIENT_VERSION`) to match whatever upstream's commit set them to, port any new `request*` helpers in `lib/api/index.ts`, and adjust call sites. The commit `ed36a247` ("Sync game 1.35.7") is a worked example.

The original definitions were extracted with [pbtk](https://github.com/marin-m/pbtk) from an early APK; the upstream repo has maintained the schema by hand since.
