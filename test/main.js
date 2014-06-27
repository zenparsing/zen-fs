import { File, Directory } from "../src/main.js";

module Path from "node:path";

export async function main() {

    console.log(await File.readText(__filename));

    
    var dir = __dirname + "/_temp/foo";

    await Directory.create(dir);
    
    var stream = await File.create(dir + "/afile.js");
    await stream.write(new Buffer("'use strict';"));
    await stream.close();
    
    await Directory.delete(Path.dirname(dir), true);
    
}
