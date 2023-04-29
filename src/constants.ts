const DBNAME = process.env.DBNAME;
const STORENAME = process.env.STORENAME;
const DEBOUNCETIME = Number(process.env.DEBOUNCETIME);
const MINIMUM_LETTERS_TO_SEARCH = Number(process.env.MINIMUM_LETTERS_TO_SEARCH);

export {
    DBNAME,
    STORENAME,
    DEBOUNCETIME,
    MINIMUM_LETTERS_TO_SEARCH,
}