declare global {
	namespace NodeJS {
		interface ProcessEnv {
			readonly MODE: string;
		}
	}
}