// const config = {
//     header: {
//         "content-type": "application/json",
//     },
// };

let skip = 0;

document.addEventListener("click", function (event) {
    if (event.target.classList.contains("add-item")) {
        event.preventDefault();
        const todoText = document.getElementById("create_field");
        // console.log("hello", todoText.value);

        if (todoText.value === "") {
            alert("Please enter todo text");
            return;
        }

        axios
            .post(
                "/create-item",
                {
                    todo: todoText.value,
                }
                // config
            )
            .then((res) => {
                if (res.data.status !== 200) {
                    alert(res.data.message);
                    return;
                }
                todoText.value = "";
            })
            .catch((err) => {
                console.log(err);
            });
    }
    if (event.target.classList.contains("edit-me")) {
        const id = event.target.getAttribute("data-id");
        const newData = prompt("Enter your new data");

        axios
            .post(
                "/edit-item",
                {
                    id,
                    newData,
                }
                // config
            )
            .then((res) => {
                if (res.data.status !== 200) {
                    alert(res.data.message);
                    return;
                }
                event.target.parentElement.parentElement.querySelector(
                    ".item-text"
                ).innerHTML = newData;
            })
            .catch((err) => {
                console.log(err);
            });
    }
    if (event.target.classList.contains("delete-me")) {
        const id = event.target.getAttribute("data-id");

        axios
            .post(
                "/delete-item",
                {
                    id,
                }
                // config
            )
            .then((res) => {
                if (res.data.status !== 200) {
                    alert(res.data.message);
                    return;
                }
                event.target.parentElement.parentElement.remove();
            })
            .catch((err) => {
                console.log(err);
            });
    }
    if (event.target.getAttribute("id") == "show_more") {
        event.preventDefault();
        // console.log("show more");
        generateTodos();
    }
});

window.onload = function () {
    generateTodos();
};

function generateTodos() {
    axios
        .post(`/pagination_dashboard?skip=${skip}`, {})
        .then((res) => {
            if (res.status !== 200) {
                alert("Failed to Read, Please Try again!");
                return;
            }
            // console.log(res.data.data[0].data);
            let todoList = res.data.data[0].data;

            if (todoList.length == 0) {
                alert("No more todos to show, Please create some");
                return;
            }
            document.getElementById("item_list").insertAdjacentHTML(
                "beforeend",
                todoList
                    .map((item) => {
                        return `<li class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
                <span class="item-text">${item.todo}</span>
                <div>
                  <button data-id="${item._id}" class="edit-me btn btn-secondary btn-sm mr-1">Edit</button>
                  <button data-id="${item._id}" class="delete-me btn btn-danger btn-sm">Delete</button>
                </div>
              </li>`;
                    })
                    .join("")
            );
            skip += todoList.length;
        })
        .catch((err) => {
            console.log(err);
            alert("Something went wrong!");
        });
}
