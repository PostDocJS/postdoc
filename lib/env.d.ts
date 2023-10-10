declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly MODE: string;
      readonly BROWSER: string;
      /** Space separated list of arguments. */
      readonly BROWSER_ARGS: string;
    }
  }
}
