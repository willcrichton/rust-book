## Ownership Recap

This chapter introduced a lot of new concepts like ownership, borrowing, and slices.
If you aren't familiar with systems programming, this chapter also introduced new concepts like memory allocation, the stack vs. the heap, pointers, and undefined behavior. Before we move on to the rest of Rust, let's first stop and take a breath. We'll review and practice with the key concepts from this chapter.

### Ownership versus Garbage Collection

To put ownership into context, we should talk about **garbage collection**.
Most programming languages use a garbage collector to manage memory, such as in Python, Javascript, Java, and Go. A garbage collector works at runtime adjacent to a running program (a tracing collector, at least). The collector scans through memory to find data that's no longer used &mdash; that is, the running program can no longer reach that data from a function-local variable. Then the collector deallocates the unused memory for later use.

The key benefit of a garbage collector is that it avoids undefined behavior (such as using freed memory), as can happen in C or C++. Garbage collection also avoids the need for a complex type system to check for undefined behavior, like in Rust. However, there are a few drawbacks to garbage collection. One obvious drawback is performance, as garbage collection incurs either frequent small overheads (for reference-counting, like in Python and Swift) or infrequent large overheads (for tracing, like in all other GC'd languages). 

But another less obvious drawback is that **garbage collection can be unpredictable**. To illustrate the point, say we are implementing a `Document` type that represents a mutable list of words. We could implement `Document` in a garbage-collected language such as Python in this way:

```python
class Document:     
    def __init__(self, words: List[str]):
        """Create a new document"""
        self.words = words

    def add_word(self, word: str):
        """Add a word to the document"""
        self.words.append(word)
        
    def get_words(self) -> List[str]:  
        """Get a list of all the words in the document"""
        return self.words
```

Here's one way we could use this `Document` class that creates a document `d`, copies it into a new document `d2`, and then mutates `d2`.

```python
words = ["Hello"]
d = Document(words)

d2 = Document(d.get_words())
d2.add_word("world")
```

Consider two key questions about this example:

1. **When is the word array deallocated?** 
This program has created three pointers to the same array. The variables `words`, `d`, and `d2` all contain a pointer to the word list allocated on the heap. Therefore Python will only deallocate the word array when all three variables are out of scope. More generally, it's often difficult to predict where data will be garbage-collected just by reading the source code.

2. **What are the contents of the document `d`?** 
Because `d2` contains a pointer to the same words array as `d`, then `d2.add_word("world")` also mutates the document `d`. Therefore in this example, the words in `d` are `["Hello", "world"]`. This happens because `d.get_words()` returns a mutable reference to the words array in `d`. Pervasive, implicit mutable references can easily lead to unpredictable bugs when data structures can leak their internals[^ownership-originally]. Here, it is probably not intended behavior that a change to `d2` can change `d`.

This problem is not unique to Python &mdash; you can encounter similar behavior in C#, Java, Javascript, and so on. In fact, most programming languages actually have a concept of pointers. It's just a question of how the language exposes pointers to the programmer. Garbage collection makes it difficult to see which variable points to which data. For example, it wasn't obvious that `d.get_words()` produced a pointer to data within `d`. 

By contrast, Rust's ownership model puts pointers front-and-center. We can see that by translating the `Document` type into a Rust data structure. Normally we would use a `struct`, but we haven't covered those yet, so we'll just use a type alias:

```rust
type Document = Vec<String>;

fn new_document(words: Vec<String>) -> Document {
    words
}

fn add_word(this: &mut Document, word: String) {
    this.push(word);
}

fn get_words(this: &Document) -> &[String] {
    this.as_slice()
}
```

This Rust API differs from the Python API in a few key ways:

* The function `new_document` consumes ownership of the input vector `words`. That means the `Document` *owns* the word vector. The word vector will be predictably deallocated when its owning `Document` goes out of scope.

* The function `add_word` requires a mutable reference `&mut Document` to be able to mutate a document. It also consumes ownership of the input `word`, meaning no one else can mutate the individual words of the document.

* The function `get_words` returns an explicit immutable reference to strings within the document. The only way to create a new document from this word vector is to deep-copy its contents, like this:

```rust,ignore
fn main() {
    let words = vec!["hello".to_string()];
    let d = new_document(words);

    // .to_vec() converts &[String] to Vec<String> by cloning each string
    let words_copy = get_words(&d).to_vec();
    let mut d2 = new_document(words_copy);
    add_word(&mut d2, "world".to_string());

    // The modification to `d2` does not affect `d`
    assert!(!get_words(&d).contains(&"world".into()));
}
```

The point of this example is to say: if Rust is not your first language, then you already have experience working with memory and pointers! Rust just makes those concepts explicit. This has the dual benefit of (1) improving runtime performance by avoiding garbage collection, and (2) improving predictability by preventing accidental "leaks" of data.

### The Concepts of Ownership

Next, let's review the concepts of ownership. This review will be quick &mdash; the goal is to remind you of the relevant concepts. If you realize you forgot or didn't understand a concept, then we will link you to the relevant chapters which you can review.

#### Ownership at Runtime

We'll start by reviewing how Rust uses memory at runtime: 
* Rust allocates local variables in stack frames, which are allocated when a function is called and deallocated when the call ends. 
* Local variables can hold either data (like numbers, booleans, tuples, etc.) or pointers. 
* Pointers can be created either through boxes (pointers owning data on the heap) or references (non-owning pointers).

This diagram illustrates how each concept looks at runtime:

```aquascope,interpreter,horizontal
fn main() {
  let mut a_num = 0;
  inner(&mut a_num);`[]`
}

fn inner(x: &mut i32) {
  let another_num = 1;
  let a_stack_ref = &another_num;

  let a_box = Box::new(2);  
  let a_box_stack_ref = &a_box;
  let a_box_heap_ref = &*a_box;`[]`

  *x += 5;
}
```

Review this diagram and make sure you understand each part. For example, you should be able to answer:
* Why does `a_box_stack_ref` point to the stack, while `a_box_heap_ref` point to the heap? 
* Why is the value `2` no longer on the heap at L2? 
* Why does `a_num` have the value `5` at L2?

If you want to review boxes, re-read [Chapter 4.1][ch04-01]. If you want to review references, re-read [Chapter 4.2][ch04-02]. If you want to see case studies involving boxes and references, re-read [Chapter 4.3][ch04-03].

Slices are a special kind of reference that refer to a contiguous sequence of data in memory. This diagram illustrates how a slice refers to a subsequence of characters in a string:

```aquascope,interpreter
fn main() {
  let s = String::from("abcdefg");
  let s_slice = &s[2..5];`[]`
}
```

If you want to review slices, re-read [Chapter 4.4][ch04-04].


#### Ownership at Compile-time

Rust tracks @Perm{read} (read), @Perm{write} (write), and @Perm{own} (own) permissions on each variable. Rust requires that a variable has appropriate permissions to perform a given operation. As a basic example, if a variable is not declared as `let mut`, then it is missing the @Perm{write} permission and cannot be mutated:

```aquascope,permissions,stepper,boundaries,shouldFail
fn main() {
  let n = 0;
  n += 1;
}
```

A variable's permissions can be changed if it is **moved** or **borrowed**. A move of a variable with a non-copyable type (like `Box<T>` or `String`) requires the @Perm{read}@Perm{own} permissions, and the move eliminates all permissions on the variable. That rule prevents the use of moved variables:

```aquascope,permissions,stepper,boundaries,shouldFail
fn main() {
  let s = String::from("Hello world");
  consume_a_string(s);
  println!("{s}"); // can't read `s` after moving it
}

fn consume_a_string(_s: String) {
  // om nom nom
}
```

If you want to review how moves work, re-read [Chapter 4.1][ch04-01].

Borrowing a variable (creating a reference to it) temporarily removes some of the variable's permissions. An immutable borrow creates an immutable reference, and also disables the borrowed data from being mutated or moved. For example, printing an immutable reference is ok:

```aquascope,permissions,stepper,boundaries
#fn main() {
let mut s = String::from("Hello");
let s_ref = &s;
println!("{s_ref}");
#}
```

But mutating an immutable reference is not ok:

```aquascope,permissions,stepper,boundaries,shouldFail
#fn main() {
let mut s = String::from("Hello");
let s_ref = &s;`(focus,paths:*s_ref)`
s_ref.push_str(" world");
#}
```

And mutating the immutably borrowed data is not ok:

```aquascope,permissions,stepper,boundaries,shouldFail
#fn main() {
let mut s = String::from("Hello");`(focus)`
let s_ref = &s;`(focus,rxpaths:s$)`
s.push_str(" world");
println!("{s_ref}");
#}
```

And moving data out of the reference is not ok:

```aquascope,permissions,stepper,boundaries,shouldFail
#fn main() {
let mut s = String::from("Hello");
let s_ref = &s;`(focus,paths:*s_ref)`
let s2 = *s_ref;
#}
```

A mutable borrow creates a mutable reference, which disables the borrowed data from being read, written, or moved. For example, mutating a mutable reference is ok:

```aquascope,permissions,stepper,boundaries
#fn main() {
let mut s = String::from("Hello");
let s_ref = &mut s;
s_ref.push_str(" world");
println!("{s}");
#}
```

But accessing the mutably borrowed data is not ok:

```aquascope,permissions,stepper,boundaries,shouldFail
#fn main() {
let mut s = String::from("Hello");
let s_ref = &mut s;`(focus,rxpaths:s$)`
println!("{s}");
s_ref.push_str(" world");
#}
```

If you want to review permissions and references, re-read [Chapter 4.2][ch04-02].

#### Connecting Ownership between Compile-time and Runtime

Rust's permissions are designed to prevent undefined behavior. For example, one kind of undefined behavior is a **use-after-free** where freed memory is read or written. Immutable borrows remove the @Perm{write} permission to avoid use-after-free, like in this case:

```aquascope,interpreter,shouldFail,horizontal
#fn main() {
let v = vec![1, 2, 3];
let n = &v[0];`[]`
v.push(4);`[]`
println!("{n}");`[]`
#}
```

Another kind of undefined behavior is a **double-free** where memory is freed twice. Dereferences of references to non-copyable data do not have the @Perm{own} permission to avoid double-frees, like in this case:

```aquascope,interpreter,shouldFail,horizontal
#fn main() {
let v = vec![1, 2, 3];
let v_ref: &Vec<i32> = &v;
let v2 = *v_ref;`[]`
drop(v2);`[]`
drop(v);`[]`
#}
```

If you want to review undefined behavior, re-read [Chapter 4.1][ch04-01] and [Chapter 4.3][ch04-03].


### The Rest of Ownership

As we introduce additional features like structs, enums, and traits, those features will have specific interactions with ownership. This chapter provides the essential foundation for understanding those interactions &mdash; the concepts of memory, pointers, undefined behavior, and permissions will help us talk about the more advanced parts of Rust in future chapters.

And don't forget to take the quizzes if you want to check your understanding!

{{#quiz ../quizzes/ch04-05-ownership-recap.toml}}



[^ownership-originally]: In fact, the original invention of ownership types wasn't about memory safety at all. It was about preventing leaks of mutable references to data structure internals in Java-like languages. If you're curious to learn more about the history of ownership types, check out the paper ["Ownership Types for Flexible Alias Protection"](https://dl.acm.org/doi/abs/10.1145/286936.286947) (Clarke et al. 1998).

[ch04-01]: ch04-01-what-is-ownership.html
[ch04-02]: ch04-02-references-and-borrowing.html
[ch04-03]: ch04-03-fixing-ownership-errors.html
[ch04-04]: ch04-04-slices.html