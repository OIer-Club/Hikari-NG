function sensor(str){
    return str.replace(/##/g,"--")
            .replace(/system/g,"printf")
            .replace(/freopen/g,"")
            .replace(/fstream/g,"")
            .replace(/windows.h/g,"")
            .replace(/CON/g,"")
}

module.exports = {
    sensor
};