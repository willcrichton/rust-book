# Design Trade-offs

This section is about **design trade-offs** in Rust. To be an effective Rust engineer, it's not enough just to know how Rust works. You have to decide which of Rust's many tools are appropriate for a given job. In this section, we will give you a sequence of quizzes about your understanding of design trade-offs in Rust.  After each quiz, we will explain in-depth our rationale for each question.

Here's an example of what a question will look like. It will start out by describing a software case study with a space of designs:

> **Context:** You are designing an application with a global configuration, e.g. containing command-line flags.
>
> **Functionality:** The application needs to pass immutable references to this configuration throughout the application.
>
> **Designs:** Below are several proposed designs to implement the functionality.
>
> ```rust,ignore
> use std::rc::Rc;
> use std::sync::Arc;
>
> struct Config { 
>     flags: Flags,
>     // .. more fields ..
> }
> 
> // Option 1: use a reference
> struct ConfigRef<'a>(&'a Config);
> 
> // Option 2: use a reference-counted pointer
> struct ConfigRef(Rc<Config>);
> 
> // Option 3: use an atomic reference-counted pointer
> struct ConfigRef(Arc<Config>);
> ```

Given just the context and key functionality, all three designs are potential candidates. 
We need more information about the system goals to decide which ones make the most sense.
Hence, we give a new requirement:

> Select each design option that satisfies the following requirement:
>
> **Requirement:** The configuration reference must be shareable between multiple threads.
>
> **Answer:**
>
> <input type="checkbox" checked disabled> Option 1 <br>
> <input type="checkbox" disabled> Option 2 <br>
> <input type="checkbox" checked disabled> Option 3 <br>

In formal terms, this means that `ConfigRef` implements [`Send`] and [`Sync`]. 
Assuming `Config: Send + Sync`, then both `&Config` and `Arc<Config>` satisfy this requirement,
but [`Rc`] does not (because non-atomic reference-counted pointers are not thread-safe). So Option 2 does not satisfy the requirement, while Option 3 does.

We might also be tempted to conclude that Option 1 does not satisfy the requirement because functions like [`thread::spawn`] require that all data moved into a thread can only contain references with a `'static` lifetime. However, that does not rule out Option 1 for two reasons:
1.  The `Config` could be stored as a global static variable (e.g., using [`OnceLock`]), so one could construct `&'static Config` references.
2. Not all concurrency mechanisms require `'static` lifetimes, such as [`thread::scope`]. 

Therefore the requirement as-stated only rules out non-[`Send`] types, and we consider Options 1 and 3 to be the correct answers.

[`thread::spawn`]: https://doc.rust-lang.org/std/thread/fn.spawn.html
[`Send`]: https://doc.rust-lang.org/std/marker/trait.Send.html
[`Sync`]: https://doc.rust-lang.org/std/marker/trait.Sync.html
[`Rc`]: https://doc.rust-lang.org/std/rc/struct.Rc.html
[`OnceLock`]: https://doc.rust-lang.org/std/sync/struct.OnceLock.html
[`thread::scope`]: https://doc.rust-lang.org/std/thread/fn.scope.html

<hr>

Now you try with the questions below! Each section contains a quiz focused on a single scenario. Complete the quiz, and make sure to read the answer context after each quiz. These questions are both experimental and opinionated &mdash; please leave us feedback via the bug button 🐞 if you disagree with our answers.

Along with each quiz, we have also provided links to popular Rust crates that served as inspiration for the quiz.

## References

*Inspiration:* [Bevy assets], [Petgraph node indices], [Cargo units]

{{#quiz ../quizzes/ch17-05-design-challenge-references.toml}}


[Bevy assets]: https://docs.rs/bevy/0.11.2/bevy/asset/struct.Assets.html
[Petgraph node indices]: https://docs.rs/petgraph/0.6.4/petgraph/graph/struct.NodeIndex.html
[Cargo units]: https://docs.rs/cargo/0.73.1/cargo/core/compiler/struct.Unit.html

## Trait Trees

*Inspiration:* [Yew components], [Druid widgets]

{{#quiz ../quizzes/ch17-05-design-challenge-trait-trees.toml}}

[Yew components]: https://docs.rs/yew/0.20.0/yew/html/trait.Component.html
[Druid widgets]: https://docs.rs/druid/0.8.3/druid/trait.Widget.html

## Dispatch

*Inspiration:* [Bevy systems], [Diesel queries], [Axum handlers]

{{#quiz ../quizzes/ch17-05-design-challenge-dispatch.toml}}

[Bevy systems]: https://docs.rs/bevy_ecs/0.11.2/bevy_ecs/system/trait.IntoSystem.html
[Diesel queries]: https://docs.diesel.rs/2.1.x/diesel/query_dsl/trait.BelongingToDsl.html
[Axum handlers]: https://docs.rs/axum/0.6.20/axum/handler/trait.Handler.html

## Intermediates

*Inspiration:* [Serde] and [miniserde]

{{#quiz ../quizzes/ch17-05-design-challenge-intermediates.toml}}

[Serde]: https://docs.rs/serde/1.0.188/serde/trait.Serialize.html
[miniserde]: https://docs.rs/miniserde/0.1.34/miniserde/trait.Serialize.html