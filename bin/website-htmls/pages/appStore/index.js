import { defineElement, ref } from "zipaper"
import template from "./index.html"
import style from "./index.scss"

export default defineElement({
    template,
    data() {
        return {

        }
    },
    methods: {
        goto(url) {
            this.$goto(url)
        }
    },
    style: {
        content: style
    }
})