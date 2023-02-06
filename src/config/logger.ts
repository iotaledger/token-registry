import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";

const logLevel: string = process.env.LOG_LEVEL ?? "info";

const { combine, timestamp, label, printf } = format;
const theFormat = combine(
    label({ label: "token-registry" }),
    timestamp(),
    printf(({ level, message, label, timestamp }) => {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        return `${timestamp} [${label}] ${level}: ${message}`;
    })
)

const logger = createLogger({
    level: logLevel,
    format: format.json(),
    defaultMeta: { service: "token-registry" },
    transports: [
        new transports.DailyRotateFile({
            filename: "logs/app-%DATE%.log",
            zippedArchive: true,
            maxSize: "20m",
            maxFiles: "14d"
        })
    ]
});

if (process.env.NODE_ENV !== "production") {
    logger.add(new transports.Console({
        level: logLevel,
        format: combine(
            format.colorize(),
            theFormat
        ),
    }));
}

export default logger;

