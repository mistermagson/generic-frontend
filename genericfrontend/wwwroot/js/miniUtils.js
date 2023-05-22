function call_GET_JSON_PURA(urlGET) {

    $.ajaxSetup({
        scriptCharset: "utf-8",
        contentType: "application/json; charset=utf-8"
    });

    var myCallPromise = new Promise((resolve, reject) => {
        $.ajax({
            url: urlGET,
            type: "GET",
            contentType: "application/json",
            dataType: "json",
            cache: false,
            success: function (data) {
                resolve(data);
            },
            error: function (err) {
                reject(Error("Ocorreu um erro em call_GET_JSON_PROMISE!" + err));
            }
        });
    });

    return myCallPromise;

}