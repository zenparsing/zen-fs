import {

    prime,
    pumpBytes,
    decodeText,
    concatText,
    mutex,

} from "streamware";

import * as FS from "./FS.js";

export {

    openWrite,
    openRead,
    readFile as read,
    writeFile as write,
    statFile as stat,
    fileExists as exists,
    deleteFile as delete,
    createFile as create,
    readText,
    writeText,

};


const READ_BUFFER_SIZE = 64 * 1024;


class FileReader {

    constructor(fd, position = 0, end = Infinity) {

        this.fd = fd;
        this.position = position;
        this.end = Infinity;
        this._mutex = mutex();
    }

    async seek(position) {

        await this._mutex($=> this.position = position);
    }

    async read(buffer = new Buffer(READ_BUFFER_SIZE)) {

        return this._mutex(async $=> {

            if (buffer.length === 0)
                return buffer;

            let toRead = Math.min(this.end - this.position, buffer.length);
            let bytesRead = await FS.read(this.fd, buffer, 0, toRead, this.position);

            this.position += bytesRead;

            if (bytesRead === 0)
                return null;

            if (bytesRead < buffer.length)
                buffer = buffer.slice(0, bytesRead);

            return buffer;
        });
    }

    async close() {

        await this._mutex($=> FS.close(this.fd));
    }

    [Symbol.asyncIterator]() {

        let reader = this;

        return async function*() {

            let chunk = yield null;

            while (true) {

                let output = await reader.read(chunk);

                if (!output)
                    break;

                chunk = yield output;
            }

        }::prime();
    }

}


class FileWriter {

    constructor(fd, position = 0) {

        this.fd = fd;
        this.position = position;
        this._mutex = mutex();
    }

    async seek(position) {

        await this._mutex($=> this.position = position);
    }

    async write(buffer) {

        await this._mutex(async $=> {

            if (buffer.length === 0)
                return;

            let offset = this.position;
            this.position += buffer.length;

            await FS.write(this.fd, buffer, 0, buffer.length, offset);
        });
    }

    async close() {

        await this._mutex($=> FS.close(this.fd));
    }

}


async function openRead(path, start, end) {

    return new FileReader(await FS.open(path, "r"), start, end)
}


async function openWrite(path, start) {

    return new FileWriter(await FS.open(path, "w"), start);
}


function readFile(path, start, end) {

    return async function*() {

        let chunk = yield null,
            reader = await openRead(path, start, end);

        try {

            while (true) {

                let output = await reader.read(chunk);

                if (!output)
                    break;

                chunk = yield output;
            }

        } finally {

            await reader.close();
        }

    }::prime();
}


async function writeFile(input, path, start) {

    let writer = await openWrite(path, start);

    try {

        for await (let chunk of input)
            await writer.write(chunk);

    } finally {

        await writer.close();
    }
}


async function statFile(path) {

    try {

        let stat = await FS.stat(path);
        if (stat.isFile()) return stat;

    } catch (x) { }

    return null;
}


async function fileExists(path) {

    return await statFile(path) !== null;
}


function deleteFile(path) {

    return FS.unlink(path);
}


function createFile(path) {

    return writeFile([], path);
}


function readText(path, encoding) {

    return readFile(path)
        ::pumpBytes({ size: READ_BUFFER_SIZE })
        ::decodeText(encoding)
        ::concatText();
}


function writeText(path, text, encoding = "utf8") {

    return writeFile([ new Buffer(text, encoding) ], path);
}
