{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  };

  outputs = {
    self,
    nixpkgs,
    ...
  }: let
    system = "x86_64-linux";
    pkgs = import nixpkgs {inherit system;};
  in
    with pkgs; rec {
      devShells.${system}.default = mkShell rec {
        buildInputs = with pkgs; [
          nodejs_22 # Until bun has a stable ws update implementation for shoukaku
          pnpm # Package manager
          biome # Linter
        ];

        VSCODE_SETTINGS = builtins.toJSON {
          "biome.lspBin" = "${pkgs.biome}/bin/biome";
          "editor.defaultFormatter" = "biomejs.biome";
          "biome.enabled" = true;
          "[typescript]" = {
            "editor.defaultFormatter" = "biomejs.biome";
          };
        };

        shellHook = ''
          mkdir .vscode
          echo $VSCODE_SETTINGS > .vscode/settings.json

          ${pkgs.pnpm}/bin/pnpm install
        '';
      };
    };
}
