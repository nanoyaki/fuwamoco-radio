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
          bun
          biome
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

          ${pkgs.bun}/bin/bun install
        '';
      };
    };
}
