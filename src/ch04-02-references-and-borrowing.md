## References and Borrowing

Ownership, boxes, and moves provide a foundation for safely programming with the heap. However, move-only APIs can be inconvenient to use. For example, say you want to read some strings twice:

```aquascope,interpreter,shouldFail,horizontal
fn main() {
    let m1 = String::from("Hello");
    let m2 = String::from("world");
    greet(m1, m2);`[]`
    let s = format!("{} {}", m1, m2);`[]` // Error: m1 and m2 are moved
}

fn greet(g1: String, g2: String) {
    println!("{} {}!", g1, g2);`[]`
}
```

In this example, calling `greet` moves the data from `m1` and `m2` into the parameters of `greet`. Both strings are dropped at the end of `greet`, and therefore cannot be used within `main`. If we try to read them like in the operation `format!(..)`, then that would be undefined behavior. The Rust compiler therefore rejects this program with the same error we saw last section:

```text
error[E0382]: borrow of moved value: `m1`
 --> test.rs:5:30
 (...rest of the error...)
```

This move behavior is extremely inconvenient. Programs often need to use a string more than once. An alternative `greet` could return ownership of the strings, like this:

```aquascope,interpreter,horizontal
fn main() {
    let m1 = String::from("Hello");
    let m2 = String::from("world");`[]`
    let (m1_again, m2_again) = greet(m1, m2);
    let s = format!("{} {}", m1_again, m2_again);`[]`
}

fn greet(g1: String, g2: String) -> (String, String) {
    println!("{} {}!", g1, g2);
    (g1, g2)
}
```

However, this style of program is quite verbose. Rust provides a concise style of reading and writing without moves through references.

### References Are Non-Owning Pointers

A **reference** is a kind of pointer. Here's an example of a reference that rewrites our `greet` program in a more convenient manner:

```aquascope,interpreter,horizontal
fn main() {
    let m1 = String::from("Hello");
    let m2 = String::from("world");`[]`
    greet(&m1, &m2);`[]` // note the ampersands
    let s = format!("{} {}", m1, m2);
}

fn greet(g1: &String, g2: &String) { // note the ampersands
    `[]`println!("{} {}!", g1, g2);
}
```

The expression `&m1` uses the ampersand operator to create a reference to (or "borrow") `m1`. The type of the `greet` parameter `g1` is changed to `&String`, meaning "a reference to a `String`". 

<!-- At runtime, the references look like this:

<img src="img/experiment/ch04-02-stack1.jpg" class="center" width="350" /> -->

Observe at L2 that there are two steps from `g1` to the string "Hello". `g1` is a reference that points to `m1` on the stack, and `m1` is a String containing a box that points to "Hello" on the heap.

While `m1` owns the heap data "Hello", `g1` does _not_ own either `m1` or "Hello". Therefore after `greet` ends and the program reaches L3, no heap data has been deallocated. Only the stack frame for `greet` disappears. This fact is consistent with our *Moved Heap Data Principle*. Because `g1` did not own "Hello", Rust did not deallocate "Hello" on behalf of `g1`.

References are **non-owning pointers**, because they do not own the data they point to.

### Dereferencing a Pointer Accesses Its Data

The previous examples using boxes and strings have not shown how Rust "follows" a pointer to its data. For example, the `println!` macro has mysteriously worked for both owned strings of type `String`, and for string references of type `&String`. The underlying mechanism is the **dereference** operator, written with an asterisk (`*`). For example, here's a program that uses dereferences in a few different ways:

```aquascope,interpreter
#fn main() {
let mut x: Box<i32> = Box::new(1);
let a: i32 = *x;         // *x reads the heap value, so a = 1
*x += 1;                 // *x on the left-side modifies the heap value, 
                         //     so x points to the value 2

let r1: &Box<i32> = &x;  // r1 points to x on the stack
let b: i32 = **r1;       // two dereferences get us to the heap value

let r2: &i32 = &*x;      // r2 points to the heap value directly
let c: i32 = *r2;`[]`    // so only one dereference is needed to read it
#}
```

Observe the difference between `r1` pointing to `x` on the stack, and `r2` pointing to the heap value `2`.

You probably won't see the dereference operator very often when you read Rust code. Rust implicitly inserts dereferences and references in certain cases, such as calling a method with the dot operator. For example, this program shows two equivalent ways of calling the [`i32::abs`](https://doc.rust-lang.org/std/primitive.i32.html#method.abs) (absolute value) and [`str::len`](https://doc.rust-lang.org/std/primitive.str.html#method.len) (string length) functions:

```rust,ignore
#fn main()  {
let x: Box<i32> = Box::new(-1);
let x_abs1 = i32::abs(*x); // explicit dereference
let x_abs2 = x.abs();      // implicit dereference
assert_eq!(x_abs1, x_abs2);

let r: &Box<i32> = &x;
let r_abs1 = i32::abs(**r); // explicit dereference (twice)
let r_abs2 = r.abs();       // implicit dereference (twice)
assert_eq!(r_abs1, r_abs2);

let s = String::from("Hello");
let s_len1 = str::len(&s); // explicit reference
let s_len2 = s.len();      // implicit reference
assert_eq!(s_len1, s_len2);
#}
```

This example shows implicit conversions in three ways:
1. The `i32::abs` function expects an input of type `i32`. To call `abs` with a `Box<i32>`, you can explicitly dereference the box like `i32::abs(*x)`. You can also implicitly dereference the box using method-call syntax like `x.abs()`. The dot syntax is syntactic sugar for the function-call syntax.

2. This implicit conversion works for multiple layers of pointers. For example, calling `abs` on a reference to a box `r: &Box<i32>` will insert two dereferences. 

3. This conversion also works the opposite direction. The function `str::len` expects a reference `&str`. If you call `len` on an owned `String`, then Rust will insert a single borrowing operator. (In fact, there is a further conversion from `String` to `str`!)

We will say more about method calls and implicit conversions in later chapters. For now, the important takeaway is that these conversions are happening with method calls and some macros like `println`. We want to unravel all the "magic" of Rust so you can have a clear mental model of how Rust works.

{{#quiz ../quizzes/ch04-02-references-sec1-basics.toml}}

### Rust Avoids Simultaneous Aliasing and Mutation

Pointers are a powerful and dangerous feature because they enable **aliasing**. Aliasing is accessing the same data through different variables. On its own, aliasing is harmless. But combined with **mutation**, we have a recipe for disaster. One variable can "pull the rug out" from another variable in many ways, for example:

- By deallocating the aliased data, leaving the other variable to point to deallocated memory.
- By mutating the aliased data, invalidating runtime properties expected by the other variable.
- By _concurrently_ mutating the aliased data, causing a data race with nondeterministic behavior for the other variable.

As a running example, we are going to look at programs using the vector data structure, [`Vec`]. Unlike arrays which have a fixed length, vectors have a variable length by storing their elements in the heap. For example, [`Vec::push`] adds an element to the end of a vector, like this:

```aquascope,interpreter,horizontal
#fn main() {
let mut vec: Vec<i32> = vec![1, 2, 3];`[]`
vec.push(4);`[]`
#}
```

The macro `vec!` creates a vector with the elements between the brackets. The vector `vec` has type `Vec<i32>`. The syntax `<i32>` means the elements of the vector have type `i32`.

One important implementation detail is that `vec` allocates a heap array of a certain *capacity*. We can peek into `Vec`'s internals and see this detail for ourselves:

```aquascope,interpreter,horizontal,concreteTypes
#fn main() {
let mut vec: Vec<i32> = vec![1, 2, 3];`[]`
#}
```

> *Note:* click the binocular icon in the top right of the diagram to toggle this detailed view in any runtime diagram.

Notice that the vector has a length (`len`) of 3 and a capacity (`cap`) of 3. The vector is at capacity. So when we do a `push`, the vector has to create a new allocation with larger capacity, copy all the elements over, and deallocate the original heap array. In the diagram above, the array `1 2 3 4` is in a (potentially) different memory location than the original array `1 2 3`.

To tie this back to memory safety, let's bring references into the mix. Say we created a reference to a vector's heap data. Then that reference can be invalidated by a push, as simulated below:

```aquascope,interpreter,shouldFail,horizontal
#fn main() {
let mut vec: Vec<i32> = vec![1, 2, 3];
let num: &i32 = &vec[2];`[]`
vec.push(4);`[]`
println!("Third element is {}", *num);`[]`
#}
```

Initially, `vec` points to an array with 3 elements on the heap. Then `num` is created as a reference to the third element, as seen at L1. However, the operation `v.push(4)` resizes `vec`. The resize will deallocate the previous array and allocate a new, bigger array. In the process, `num` is left pointing to invalid memory. Therefore at L3, dereferencing `*num` reads invalid memory, causing undefined behavior.

In more abstract terms, the issue is that the vector `vec` is both aliased (by the reference `num`) and mutated (by the operation `vec.push(4)`). So to avoid these kinds of issues, Rust follows a basic principle:

> **Pointer Safety Principle**: data should never be aliased and mutated at the same time.

Data can be aliased. Data can be mutated. But data cannot be _both_ aliased _and_ mutated. For example, Rust enforces this principle for boxes (owned pointers) by disallowing aliasing. Assigning a box from one variable to another will move ownership, invalidating the previous variable. Owned data can only be accessed through the owner &mdash; no aliases.

However, because references are non-owning pointers, they need different rules than boxes to ensure the *Pointer Safety Principle*. By design, references are meant to temporarily create aliases. In the rest of this section, we will explain the basics of how Rust ensures the safety of references through the **borrow checker.**

### References Change Permissions on Paths

The core idea behind the borrow checker is that variables have three kinds of **permissions** on their data:

- **Read** (@Perm{read}): data can be copied to another location.
- **Write** (@Perm{write}): data can be mutated in-place.
- **Own** (@Perm{own}): data can be moved or dropped.

These permissions don't exist at runtime, only within the compiler. They describe how the compiler "thinks" about your program before the program is executed.

By default, a variable has read/own permissions (@Perm{read}@Perm{own}) on its data. If a variable is annotated with `let mut`, then it also has the write permission (@Perm{write}). The key idea is 
that **references can temporarily remove these permissions.** 

To illustrate this idea, let's look at the permissions on a variation of the program above that is actually safe. The `push` has been moved after the `println!`. The permissions in this program are visualized with a new kind of diagram. The diagram shows the changes in permissions on each line.

```aquascope,permissions,stepper
#fn main() {
let mut vec: Vec<i32> = vec![1, 2, 3];
let num: &i32 = &vec[2];
println!("Third element is {}", *num);
vec.push(4);
#}
```

Let's walk through each line:

1. After `let mut vec = (...)`, the variable `vec` has been initialized (indicated by <i class="fa fa-level-up"></i>). It gains @Perm[gained]{read}@Perm[gained]{write}@Perm[gained]{own} permissions (the plus sign indicates gain).
2. After `let num = &vec[2]`, the data in `vec` has been **borrowed** by `num` (indicated by <i class="fa fa-arrow-right"></i>). Three things happen:
   - The borrow removes @Perm[lost]{write}@Perm[lost]{own} permissions from `vec` (the slash indicates loss). `vec` cannot be written or owned, but it can still be read.
   - The variable `num` has gained @Perm{read}@Perm{own} permissions. `num` is not writable (the missing @Perm{write} permission is shown as a dash <span class="perm write">‒</span>) because it was not marked `let mut`.
   - The **path** `*num` has gained @Perm{read}@Perm{own} permissions.
3. After `println!(...)`, then `num` is no longer in use, so `vec` is no longer borrowed. Therefore:
   - `vec` regains its @Perm{write}@Perm{own} permissions (indicated by <i class="fa fa-rotate-left"></i>).
   - `num` and `*num` have lost all of their permissions (indicated by <i class="fa fa-level-down"></i>).
4. After `vec.push(4)`, then `vec` is no longer in use, and it loses all of its permissions.

Next, let's explore a few nuances of the diagram. First, why do you see both `num` and `*num`? Because it's different to access data through a reference, versus to manipulate the reference itself. For example, say we declared a reference to a number with `let mut`:

```aquascope,permissions,stepper
#fn main() {
let x = 0;
let mut x_ref = &x;
# println!("{x_ref} {x}");
#}
```

Notice that `x_ref` has the @Perm{write} permission, while `*x_ref` does not. That means we can assign `x_ref` to a different reference (e.g. `x_ref = &y`), but we cannot mutate the pointed data (e.g. `*x_ref += 1`).

> *Note:* you might wonder why `*num` and `*x_ref` have the @Perm{own} permission, since references are non-owning pointers. That's because the vector contains numbers of type `i32`, and `i32` is a *copyable* type. We will discuss this difference more next section in ["Copying vs. Moving Out of a Collection"](ch04-03-fixing-ownership-errors.html#fixing-an-unsafe-program-copying-vs-moving-out-of-a-collection).

More generally, permissions are defined on **paths** and not just variables. A path is anything you can put on the left-hand side of an assignment. Paths include:

- Variables, like `a`.
- Dereferences of paths, like `*a`.
- Array accesses of paths, like `a[0]`.
- Fields of paths, like `a.0` for tuples or `a.field` for structs (discussed next chapter).
- Any combination of the above, like `*((*a)[0].1)`.


Second, why do paths lose permissions when they become unused? Because some permissions are mutually exclusive. If `num = &vec[2]`, then `vec` cannot be mutated or dropped while `num` is in use. But that doesn't mean it's invalid to use `num` for more time. For example, if we add another `print` to the above program, then `num` simply loses its permissions later:

```aquascope,permissions,stepper
#fn main() {
let mut vec: Vec<i32> = vec![1, 2, 3];
let num: &i32 = &vec[2];
println!("Third element is {}", *num);
println!("Again, the third element is {}", *num);
vec.push(4);
#}
```

### The Borrow Checker Finds Permission Violations

Recall the *Pointer Safety Principle*: data should not be aliased and mutated. The goal of these permissions is to ensure that data cannot be mutated if it is aliased. Creating a reference to data ("borrowing" it) causes that data to be temporarily read-only until the reference is no longer used.

Rust uses these permissions in its **borrow checker**. The borrow checker looks for potentially unsafe operations involving references. Let's return to the unsafe program we saw earlier, where `push` invalidates a reference. This time we'll add another aspect to the permissions diagram:

```aquascope,permissions,boundaries,stepper,shouldFail
#fn main() {
let mut vec: Vec<i32> = vec![1, 2, 3];
let num: &i32 = &vec[2];`{}`
vec.push(4);`{}`
println!("Third element is {}", *num);
#}
```

Any time a path is used, Rust expects that path to have certain permissions depending on the operation. For example, the borrow `&vec[2]` requires that `vec` is readable. Therefore the @Perm{read} permission is shown between the operation `&` and the path `vec`. The letter is filled-in because `vec` has the read permission at that line. 

By contrast, the mutating operation `vec.push(4)` requires that `vec` is readable and writable. Both @Perm{read} and @Perm{write} are shown. However, `vec` does not have write permissions (it is borrowed by `num`). So the letter @Perm[missing]{write} is hollow, indicating that the write permission is *expected* but `vec` does not have it.

If you try to compile this program, then the Rust compiler will return the following error:

```text
error[E0502]: cannot borrow `vec` as mutable because it is also borrowed as immutable
 --> test.rs:4:1
  |
3 | let num: &i32 = &vec[2];
  |                  --- immutable borrow occurs here
4 | vec.push(4);
  | ^^^^^^^^^^^ mutable borrow occurs here
5 | println!("Third element is {}", *num);
  |                                 ---- immutable borrow later used here
```

The error message explains that `vec` cannot be mutated while the reference `num` is in use. That's the surface-level reason &mdash; the underlying issue is that `num` could be invalidated by `push`. Rust catches that potential violation of memory safety.


### Mutable References Provide Unique and Non-Owning Access to Data

The references we have seen so far are read-only **immutable references** (also called **shared references**). Immutable references permit aliasing but disallow mutation. However, it is also useful to temporarily provide mutable access to data without moving it.

The mechanism for this is **mutable references** (also called **unique references**). Here's a simple example of a mutable reference with the accompanying permissions changes:

```aquascope,permissions,stepper,boundaries
#fn main() {
let mut vec: Vec<i32> = vec![1, 2, 3];
let num: &mut i32 = &mut vec[2];
*num += 1;
println!("Third element is {}", *num);
println!("Vector is now {:?}", vec);
#}
```

> <div style="margin-block-start: 1em; margin-block-end: 1em"><i>Note:</i> when the expected permissions are not strictly relevant to an example, we will abbreviate them as dots like <div class="permission-stack stack-size-2"><div class="perm read"><div class="small">•</div><div class="big">R</div></div><div class="perm write"><div class="small">•</div><div class="big">W</div></div></div>. You can hover your mouse over the circles (or tap on a touchscreen) to see the corresponding permission letters.</div>

A mutable reference is created with the `&mut` operator. The type of `num` is written as `&mut i32`. Compared to immutable references, you can see two important differences in the permissions:

1. When `num` was an immutable reference, `vec` still had @Perm{read} permissions. Now that `num` is a mutable reference, `vec` has lost _all_ permissions while `num` is in use.
2. When `num` was an immutable reference, the path `*num` only had @Perm{read}@Perm{own} permissions. Now that `num` is a mutable reference, `*num` has also gained the @Perm{write} permission.

The first observation is what makes mutable references *safe*. Mutable references allow mutation but prevent aliasing. The borrowed path `vec` becomes temporarily unusable, so effectively not an alias.

The second observation is what makes mutable references *useful*. `vec[2]` can be mutated through `*num`. For example, `*num += 1` mutates `vec[2]`. Note that `*num` has the @Perm{write} permission, but `num` does not. `num` refers to the mutable reference itself, e.g. `num` cannot be reassigned to a *different* mutable reference.

Mutable references can also be temporarily "downgraded" to read-only references. For example:

```aquascope,permissions,stepper,boundaries
#fn main() {
let mut vec: Vec<i32> = vec![1, 2, 3];
let num: &mut i32 = &mut vec[2];`(focus,paths:*num)`
let num2: &i32 = &*num;`(focus,paths:*num)`
println!("{} {}", *num, *num2);
#}
```

> *Note:* when permission changes are not relevant to an example, we will hide them. You can view hidden steps by clicking "»", and you can view hidden permissions within a step by clicking "● ● ●".

In this program, the borrow `&*num` removes the @Perm{write} permission from `*num` but _not_ the @Perm{read} permission, so `println!(..)` can read both `*num` and `*num2`.


### Permissions Are Returned At The End of a Reference's Lifetime

We said above that a reference changes permissions while it is "in use". The phrase "in use" is describing a reference's **lifetime**, or the range of code spanning from its birth (where the reference is created) to its death (the last time(s) the reference is used).

For example, in this program, the lifetime of `y` starts with `let y = &x`, and ends with `let z = *y`:

```aquascope,permissions,stepper,boundaries
#fn main() {
let mut x = 1;
let y = &x;`(focus,paths:x)`
let z = *y;`(focus,paths:x)`
x += z;
#}
```

The @Perm{write} permission on `x` is returned to `x` after the lifetime of `y` has ended, like we have seen before.

In the previous examples, a lifetime has been a contiguous region of code. However, once we introduce control flow, this is not necessarily the case. For example, here is a function that capitalizes the first character in a vector of ASCII characters:

```aquascope,permissions,stepper,boundaries
fn ascii_capitalize(v: &mut Vec<char>) {
    let c = &v[0];`(focus,paths:*v)`
    if c.is_ascii_lowercase() {
        let up = c.to_ascii_uppercase();`(focus,paths:*v)`
        v[0] = up;
    } else {`(focus,paths:*v)`
        println!("Already capitalized: {:?}", v);
    }
}
```

The variable `c` has a different lifetime in each branch of the if-statement. In the then-block, `c` is used in the expression `c.to_ascii_uppercase()`. Therefore `*v` does not regain the @Perm{write} permission until after that line.

However, in the else-block, `c` is not used. `*v` immediately regains the @Perm{write} permission on entry to the else-block.

{{#quiz ../quizzes/ch04-02-references-sec2-perms.toml}}


### Data Must Outlive All Of Its References

As a part of the *Pointer Safety Principle*, the borrow checker enforces that **data must outlive any references to it.** Rust enforces this property in two ways. The first way deals with references that are created and dropped within the scope of a single function. For example, say we tried to drop string while holding a reference to it:

```aquascope,permissions,stepper,boundaries,shouldFail
#fn main() {
let s = String::from("Hello world");
let s_ref = &s;`(focus,rxpaths:s$)`
drop(s);`{}`
println!("{}", s_ref);
#}
```

To catch these kinds of errors, Rust uses the permissions we've already discussed. The borrow `&s` removes the @Perm{own} permission from `s`. However, `drop` expects the @Perm{own} permission, leading to a permission mismatch.

The key idea is that in this example, Rust knows how long `s_ref` lives. But Rust needs a different enforcement mechanism when it doesn't know how long a reference lives. Specifically, when references are either input to a function, or output from a function. For example, here is a safe function that returns a reference to the first element in a vector:

```aquascope,permissions,boundaries,showFlows
fn first(strings: &Vec<String>) -> &String {
    let s_ref = &strings[0];
    return s_ref;`{}`
}
```

This snippet introduces a new kind of permission, the flow permission @Perm{flow}. The @Perm{flow} permission is expected whenever an expression uses an input reference (like `&strings[0]`), or returns an output reference (like `return s_ref`). 

Unlike the @Perm{read}@Perm{write}@Perm{own} permissions, @Perm{flow} does not change throughout the body of a function. A reference has the @Perm{flow} permission if it's allowed to be used (that is, to *flow*) in a particular expression. For example, let's say we change `first` to a new function `first_or` that includes a `default` parameter:

```aquascope,permissions,boundaries,showFlows,shouldFail
fn first_or(strings: &Vec<String>, default: &String) -> &String {
    if strings.len() > 0 {
        &strings[0]`{}`
    } else {
        default`{}`
    }    
}
```

This function no longer compiles, because the expressions `&strings[0]` and `default` lack the necessary @Perm{flow} permission to be returned. But why? Rust gives the following error:

```text
error[E0106]: missing lifetime specifier
 --> test.rs:1:57
  |
1 | fn first_or(strings: &Vec<String>, default: &String) -> &String {
  |                      ------------           -------     ^ expected named lifetime parameter
  |
  = help: this function's return type contains a borrowed value, but the signature does not say whether it is borrowed from `strings` or `default`
```

The message "missing lifetime specifier" is a bit mysterious, but the help message provides some useful context. If Rust *just* looks at the function signature, it doesn't know whether the output `&String` is a reference to either `strings` or `default`. To understand why that matters, let's say we used `first_or` like this:

```rust,ignore
fn main() {
    let strings = vec![];
    let default = String::from("default");
    let s = first_or(&strings, &default);
    drop(default);
    println!("{}", s);
}
```

This program is unsafe if `first_or` allows `default` to *flow* into the return value. Like the previous example, `drop` could invalidate `s`. Rust would only allow this program to compile if it was *certain* that `default` cannot flow into the return value.

To specify whether `default` can be returned, Rust provides a mechanism called *lifetime parameters*. We will explain that feature later in Chapter 10.3, ["Validating References with Lifetimes"](ch10-03-lifetime-syntax.html). For now, it's enough to know that: (1) input/output references are treated differently than references within a function body, and (2) Rust uses a different mechanism, the @Perm{flow} permission, to check the safety of those references.

To see the @Perm{flow} permission in another context, say you tried to return a reference to a variable on the stack like this:

```aquascope,permissions,boundaries,showFlows,shouldFail
fn return_a_string() -> &String {
    let s = String::from("Hello world");
    let s_ref = &s;
    s_ref`{}`
}
```

This program is unsafe because the reference `&s` will be invalidated when `return_a_string` returns. And Rust will reject this program with a similar `missing lifetime specifier` error. Now you can understand that error means that `s_ref` is missing the appropriate flow permissions.


{{#quiz ../quizzes/ch04-02-references-sec3-safety.toml}}


### Summary

References provide the ability to read and write data without consuming ownership of it. References are created with borrows (`&` and `&mut`) and used with dereferences (`*`), often implicitly.

However, references can be easily misused. Rust's borrow checker enforces a system of permissions that ensures references are used safely:

- All variables can read, own, and (optionally) write their data.
- Creating a reference will transfer permissions from the borrowed path to the reference.
- Permissions are returned once the reference's lifetime has ended.
- Data must outlive all references that point to it.

In this section, it probably feels like we've described more of what Rust _cannot_ do than what Rust _can_ do. That is intentional! One of Rust's core features is allowing you to use pointers without garbage collection, while also avoiding undefined behavior. Understanding these safety rules now will help you avoid frustration with the compiler later.

[`String::push_str`]: https://doc.rust-lang.org/std/string/struct.String.html#method.push_str
[`Vec`]: https://doc.rust-lang.org/std/vec/struct.Vec.html
[`Vec::push`]: https://doc.rust-lang.org/std/vec/struct.Vec.html#method.push