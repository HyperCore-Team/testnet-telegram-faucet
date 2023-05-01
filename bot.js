const {
    exec
} = require("child_process");

const TelegramBot = require('node-telegram-bot-api');
const token = 'REPLACE_WITH_TELEGRAM_BOT_ID:TOKEN'
const bot = new TelegramBot(token, {
    polling: true
});


async function getZenonId() {
    rez = await bot.getChat('@REPLACE_WITH_TELEGRAM_BOT_HANDLE');
    return rez['id'];
}
const chat_id = 0

async function init() {
    console.log("INIT")
    exec("./znn-cli  wallet.createFromMnemonic \"TESTNET_FAUCET_MNEMONIC\" \"Pass-123456\" -u ws://127.0.0.1:35998", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log(`stdout: ${stdout}`);
    });

}

function timeDifference(date1, date2) {
    var difference = date1 - date2;

    var daysDifference = Math.floor(difference / 1000 / 60 / 60 / 24);
    difference -= daysDifference * 1000 * 60 * 60 * 24

    var hoursDifference = Math.floor(difference / 1000 / 60 / 60);
    difference -= hoursDifference * 1000 * 60 * 60

    var minutesDifference = Math.floor(difference / 1000 / 60);
    difference -= minutesDifference * 1000 * 60

    var secondsDifference = Math.floor(difference / 1000);
    //  console.log(difference)
    return [daysDifference, hoursDifference, minutesDifference, secondsDifference]
}

var error1 = 0
async function giveMoney(addr) {
    console.log(addr)
    error1 = 0
    cmd = "./znn-cli send " + addr + " 5000 znn -p \"Pass-123456\" -k REPLACE_WITH_TESTNET_FAUCET_ADDRESS -i 0 -u ws://127.0.0.1:35998"
    await exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            if (error.includes("invalid"))
                error1 = 1
            else
                error1 = 2
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            if (error.includes("invalid"))
                error1 = 1
            else
                error1 = 2
            return;
        }
        if (!stdout.includes("Done"))
            error1 = 2
        console.log(`stdout: ${stdout}`);
    });

    await sleep(8000);
    if (error1)
        return;
    cmd = "./znn-cli send " + addr + " 50000 qsr -p \"Pass-123456\" -k REPLACE_WITH_TESTNET_FAUCET_ADDRESS -i 0 -u ws://127.0.0.1:35998"
    await exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            if (error.includes("invalid"))
                error1 = 1
            else
                error1 = 2
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            if (error.includes("invalid"))
                error1 = 1
            else
                error1 = 2
            return;
        }
        if (!stdout.includes("Done"))
            error1 = 2
        console.log(`stdout: ${stdout}`);
    });
    await sleep(8000);
    console.log("DONE")
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const Queue = require('@supercharge/queue-datastructure')
const to_give = new Queue()

var requests = []


async function resolve() {

    while (1) {
        if (!to_give.isEmpty()) {
            let entry = to_give.dequeue()
            let addr = entry["address"];
            let chatId = entry["chatId"];
            console.log("addr", addr, "chatId", chatId);
            let t = Date.now()
            var nrs = 0
            for (let req in requests) {
                console.log(req)
                if (requests[req][0] == chatId) {

                    let res = timeDifference(t, requests[req][1])
                    if (res[0] == 0)
                        nrs = nrs + 1
                }

            }
            console.log(nrs)
            if (nrs >= 1) {
                msg = "Address " + addr + " already requested today."
                bot.sendMessage(chatId, msg);

            } else {
                await giveMoney(addr)
                requests.push([chatId, t])
                if (error1 == 0) {

                    msg = "5000 ZNN + 50000 QSR testnet funds have been sent to the address" + addr + "."
                    bot.sendMessage(chatId, msg);
                } else if (error1 == 1) {

                    msg = "The address " + addr + " is invalid."
                    bot.sendMessage(chatId, msg);
                } else {

                    msg = "There was an unexpected error. Please reach out to @dexZNNter."
                    bot.sendMessage(chatId, msg);
                }
            }
        }
        await sleep(1000);
    }
}
async function main() {
    await init();
    await sleep(10000);
    resolve()

    console.log("ontext")
    bot.onText(/\/(start|help)/, async function resp(msg, match) {
	console.log("received start/help message")
	bot.sendMessage(msg.chat.id, "Use syntax: /faucet your_testnet_znn_address")
    });
    bot.onText(/\/faucet (.+)/, async function resp(msg, match) {
        console.log("msg", msg)
        console.log("match[1]", match[1])
        const chatId = msg.chat.id;

        const addr = match[1].replace(/[\W_]+/g, ""); // the captured "whatever"
        console.log("queued addr", addr, "chatId", chatId);
        to_give.enqueue({
            "address": addr,
            "chatId": chatId
        })
    });
    //      console.log("onmessage")
    //      bot.on('message', (msg) => {console.log(msg)});
}


main()
