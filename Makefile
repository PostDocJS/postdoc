build: clean
	@echo "Compiling the project..."
	@npx tsc
	@echo "All done. You can try it now."

clean:
	@echo "Cleaning old atrifacts..."
	@npx rimraf out/*
	@echo "Done cleaning."
