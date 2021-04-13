const {
  Worker,
  isMainThread,
  parentPort,
  workerData,
} = require("worker_threads");
const os = require("os");
const path = require("path");
const inquirer = require("inquirer");
const ora = require("ora");

const workerPath = path.resolve("factorial-worker.js");
const userCPUCount = os.cpus().length;

const calculateFactorial = (number) => {
  if (number == 0) return 1;
  return new Promise(async (parentResolve, parentReject) => {
    const numbers = [...new Array(number)].map((_, i) => i + 1);

    const segmentSize = Math.ceil(numbers.length / userCPUCount);
    const segments = [];

    for (let segmentIndex = 0; segmentIndex < userCPUCount; segmentIndex++) {
      let start = segmentIndex * segmentSize;
      let end = start + segmentSize;
      let segment = numbers.slice(start, end);
      segments.push(segment);
    }

    try {
      const results = await Promise.all(
        segments.map(
          (segment) =>
            new Promise((resolve, reject) => {
              const worker = new Worker(workerPath, {
                workerData: segment,
              });

              worker.on("message", resolve);
              worker.on("error", reject);
              worker.on("exit", (code) => {
                if (code !== 0)
                  reject(new Error(`Worker stopped with exit code ${code}`));
              });
            })
        )
      );

      const finalResult = results.reduce((acc, val) => acc * val, 1);
      parentResolve(finalResult);
    } catch (e) {
      parentReject(e);
    }
  });
};

const run = async () => {
  const { inputNumber } = await inquirer.prompt([
    {
      type: "input",
      name: "inputNumber",
      message: "Calculate factorial for:",
      default: 10,
    },
  ]);
  const spinner = ora("Calculating...").start();
  const result = await calculateFactorial(Number(inputNumber));
  spinner.succeed(`Result: ${result}`);
};

run();
